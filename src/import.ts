import {
  FILIATIONS,
  INITIAL_SHEET,
  type Ability,
  type AbilityCategory,
  type AttributeKey,
  type CharacterSheet,
  type Effect,
  type Equipment,
  type FiliationSignatureState,
  type ImportReport,
  type SignatureMove,
  type SignatureResource,
} from "./model";
import { ensureFiliationSignatures, makeOfficialState, signatureDefinition } from "./filiationSignatures";
import { migrateSheet, readLegacyValues, SHEET_VERSION } from "./migrate";
import { syncAbilities } from "./abilitySync";
import { ARMOR_CATEGORIES, clampResource, deriveStats, type ArmorCategory } from "./rules";

type Dict = Record<string, unknown>;
const ATTRIBUTES: AttributeKey[] = ["for", "des", "con", "int", "sab", "car"];
const CATEGORIES: AbilityCategory[] = ["abilities", "filiation", "path", "skills", "talents"];
const EQUIPMENT_TYPES = ["Arma", "Armadura", "Escudo", "Ferramenta", "Acessório", "Relíquia", "Consumível", "Outro"];

function dict(value: unknown): Dict {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Dict : {};
}
function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function str(value: unknown, fallback = ""): string { return typeof value === "string" ? value : value == null ? fallback : String(value); }
function num(value: unknown, fallback = 0): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function bool(value: unknown, fallback = false): boolean { return typeof value === "boolean" ? value : fallback; }
function first(raw: Dict, ...keys: string[]) { return keys.map((key) => raw[key]).find((value) => value !== undefined && value !== null); }
function extras(raw: Dict, known: string[]) {
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !known.includes(key)));
}
function note(report: ImportReport, message: string) { if (!report.adjustments.includes(message)) report.adjustments.push(message); }

function normalizeAbility(rawValue: unknown, category: string, index: number, report: ImportReport): Ability {
  const raw = dict(rawValue);
  const name = str(first(raw, "name", "title"));
  const description = str(first(raw, "description", "rules"));
  const activation = str(first(raw, "activation", "action"));
  if (raw.title !== undefined && raw.name === undefined) note(report, `${category}: título convertido em nome`);
  if (raw.rules !== undefined && raw.description === undefined) note(report, `${category}: regras convertidas em descrição`);
  if (raw.action !== undefined && raw.activation === undefined) note(report, `${category}: ação convertida em ativação`);
  return {
    id: str(raw.id, `${category}-${index + 1}`), name, level: Math.max(1, Math.floor(num(raw.level, 1))),
    rank: str(raw.rank), cost: str(raw.cost), activation, range: str(raw.range, "Pessoal"),
    duration: str(raw.duration, "Instantânea"), recharge: str(raw.recharge, "Conforme descrição"),
    description, notes: str(raw.notes), extra: extras(raw, ["id", "name", "title", "level", "rank", "cost", "activation", "action", "range", "duration", "recharge", "description", "rules", "notes"]),
  };
}

function inferEquipmentType(raw: Dict): string {
  const value = str(first(raw, "type", "category"));
  if (EQUIPMENT_TYPES.includes(value)) return value;
  // O nome do item decide primeiro; as regras só desempatam (uma espada pode citar "escudo" no texto).
  const guess = (text: string) => /armaduras?/.test(text) ? "Armadura" : /escudos?/.test(text) ? "Escudo" : /(espadas?|armas?)/.test(text) ? "Arma" : "";
  return guess(`${str(raw.title)} ${str(raw.name)}`.toLowerCase()) || guess(str(raw.rules).toLowerCase()) || "Outro";
}
function normalizeEquipment(rawValue: unknown, index: number, report: ImportReport): Equipment {
  const raw = dict(rawValue);
  const type = inferEquipmentType(raw);
  if (raw.type === undefined) note(report, `equipamentos: tipo inferido como ${type}`);
  if (raw.qty !== undefined && raw.quantity === undefined) note(report, "equipamentos: qty convertido em quantidade");
  return {
    id: str(raw.id, `equipment-${index + 1}`), name: str(first(raw, "name", "title")), type,
    quantity: Math.max(0, num(first(raw, "quantity", "qty"), 1)), equipped: bool(raw.equipped),
    armorClass: num(first(raw, "armorClass", "caBonus")),
    armorCategory: ARMOR_CATEGORIES.includes(raw.armorCategory as ArmorCategory) ? raw.armorCategory as ArmorCategory : "",
    attack: str(raw.attack), damage: str(raw.damage),
    properties: str(first(raw, "properties", "rules", "description")), notes: str(raw.notes),
    extra: extras(raw, ["id", "name", "title", "type", "category", "quantity", "qty", "equipped", "armorClass", "armorCategory", "caBonus", "attack", "damage", "properties", "rules", "description", "notes"]),
  };
}

function normalizeEffect(rawValue: unknown, index: number): Effect {
  const raw = dict(rawValue);
  const whole = (value: unknown) => Math.round(num(value));
  return {
    id: str(raw.id, `effect-${index + 1}`),
    kind: raw.kind === "Maldição" ? "Maldição" : "Bênção",
    name: str(first(raw, "name", "title")), source: str(raw.source), duration: str(raw.duration),
    description: str(first(raw, "description", "rules")), active: raw.active === undefined ? true : bool(raw.active),
    ca: whole(raw.ca), initiative: whole(raw.initiative), speed: whole(raw.speed), hpMax: whole(raw.hpMax),
  };
}

function normalizeResource(value: unknown, fallback: SignatureResource | undefined): SignatureResource | undefined {
  if (value == null && !fallback) return undefined;
  const raw = dict(value);
  return {
    name: str(raw.name, fallback?.name || "Recurso"),
    current: Math.max(0, num(raw.current, fallback?.current || 0)),
    max: Math.max(0, num(raw.max, fallback?.max || 0)),
    unit: str(raw.unit, fallback?.unit || "cargas"),
  };
}

function normalizeMoves(value: unknown, fallback: SignatureMove[] = []): SignatureMove[] {
  const values = arr(value);
  if (!values.length) return fallback;
  return values.map((value, index) => {
    const raw = dict(value);
    return {
      id: str(raw.id, `signature-move-${index + 1}`),
      name: str(first(raw, "name", "title"), "Efeito ou manobra"),
      cost: str(raw.cost),
      activation: str(first(raw, "activation", "action"), "Conforme descrição"),
      description: str(first(raw, "description", "rules")),
    };
  });
}

function normalizeSignatures(rawValue: unknown, filiation: string, report: ImportReport): CharacterSheet["filiationSignatures"] {
  const rawMap = dict(rawValue);
  const map = Object.fromEntries(Object.entries(rawMap).map(([name, values]) => [name, arr(values).map((value, index) => {
    const raw = dict(value);
    const sourceId = str(raw.sourceId, str(raw.id, `signature-source-${index + 1}`));
    const definition = signatureDefinition({ sourceId } as FiliationSignatureState);
    const official = definition ? makeOfficialState(definition, filiation) : undefined;
    const resource = normalizeResource(raw.resource, official?.resource);
    return {
      id: str(raw.id, `signature-${index + 1}`), sourceId,
      title: str(first(raw, "title", "name")), rules: str(first(raw, "rules", "description")),
      selectedOptions: dict(raw.selectedOptions) as Record<string, string>, notes: str(raw.notes), custom: bool(raw.custom),
      summary: str(raw.summary, official?.summary || str(first(raw, "rules", "description"))),
      resource, recovery: str(raw.recovery), costs: str(raw.costs), moves: normalizeMoves(raw.moves ?? raw.effects, official?.moves),
      officialSnapshot: dict(raw.officialSnapshot).sourceId ? dict(raw.officialSnapshot) as FiliationSignatureState["officialSnapshot"] : official?.officialSnapshot,
      extra: extras(raw, ["id", "sourceId", "title", "name", "rules", "description", "selectedOptions", "notes", "custom", "summary", "resource", "recovery", "costs", "moves", "effects", "officialSnapshot"]),
    } satisfies FiliationSignatureState;
  })]));
  return filiation ? ensureFiliationSignatures(map, filiation) : map;
}

export function normalizeImportedSheet(candidate: unknown): { sheet: CharacterSheet; report: ImportReport; recognized: boolean } {
  const raw = dict(candidate);
  const report: ImportReport = { adjustments: [], unknownFields: [] };
  const recognized = Object.keys(raw).some((key) => ["version", "attributes", "abilityGroups", "equipment", "personality", "filiation", "name"].includes(key));
  const legacyOrigin = str(raw.race);
  const rawGroups = dict(raw.abilityGroups);
  const groups = Object.fromEntries(CATEGORIES.map((category) => [category, arr(rawGroups[category]).map((item, index) => normalizeAbility(item, category, index, report))])) as CharacterSheet["abilityGroups"];
  const legacyLegend = arr(raw.legacyLegendEntries).length ? arr(raw.legacyLegendEntries) : arr(rawGroups.legend);
  if (legacyLegend.length) report.adjustments.push("caminho da lenda legado preservado");
  const attributes = Object.fromEntries(ATTRIBUTES.map((key) => [key, num(dict(raw.attributes)[key], 10)])) as CharacterSheet["attributes"];
  const personalityRaw = dict(raw.personality);
  const personality = Object.fromEntries(["trait", "ideal", "bond", "flaw", "backgroundTrait", "backgroundBond", "appearance", "history", "notes"].map((key) => [key, str(personalityRaw[key])])) as CharacterSheet["personality"];
  const legacy = readLegacyValues(raw);
  const known = ["version", "avatarDataUrl", "name", "legendDestiny", "legacyLegendEntries", "filiation", "pathName", "origin", "race", "background", "player", "level", "hp", "hpMax", "hpMaxOverride", "hpTemp", "mana", "manaMax", "manaMaxOverride", "divineResource", "resourceMaxOverride", "favor", "sustain", "castingAttribute", "castingDcOverride", "attributes", "saveProficiencies", "domSkill", "skillRanks", "skillRankOverrides", "speed", "initiativeExtra", "caExtra", "caOverride", "initiativeOverride", "speedOverride", "perceptionOverride", "dracmas", "humanMoney", "humanMoneyCurrency", "money", "currency", "filiationSignatures", "abilityGroups", "equipment", "effects", "personality", "importReport"];
  report.unknownFields.push(...Object.keys(raw).filter((key) => !known.includes(key)));
  const base: CharacterSheet = {
    ...INITIAL_SHEET, version: 3, avatarDataUrl: str(raw.avatarDataUrl), name: str(raw.name), legendDestiny: str(raw.legendDestiny),
    filiation: str(raw.filiation), pathName: str(raw.pathName), origin: str(raw.origin, legacyOrigin), background: str(raw.background), player: str(raw.player),
    level: Math.max(1, Math.floor(num(raw.level, 1))), hp: Math.max(0, num(raw.hp)), hpMaxOverride: raw.hpMaxOverride == null ? null : Math.max(0, num(raw.hpMaxOverride)), hpTemp: Math.max(0, num(raw.hpTemp)),
    mana: Math.max(0, num(raw.mana)), manaMaxOverride: raw.manaMaxOverride == null ? null : Math.max(0, num(raw.manaMaxOverride)), divineResource: num(raw.divineResource), resourceMaxOverride: raw.resourceMaxOverride == null ? null : Math.max(0, num(raw.resourceMaxOverride)), favor: Math.max(0, Math.min(5, num(raw.favor))), sustain: Math.max(0, num(raw.sustain)),
    castingAttribute: ATTRIBUTES.includes(raw.castingAttribute as AttributeKey) ? raw.castingAttribute as AttributeKey : "sab", castingDcOverride: raw.castingDcOverride == null ? null : num(raw.castingDcOverride),
    attributes, saveProficiencies: arr(raw.saveProficiencies).filter((value): value is AttributeKey => ATTRIBUTES.includes(value as AttributeKey)), skillRankOverrides: Object.fromEntries(Object.entries(dict(raw.skillRankOverrides)).map(([key, value]) => [key, Math.max(0, Math.min(2, Math.floor(num(value))))])),
    domSkill: str(raw.domSkill), initiativeExtra: num(raw.initiativeExtra), caExtra: num(raw.caExtra),
    caOverride: raw.caOverride == null ? null : num(raw.caOverride),
    initiativeOverride: raw.initiativeOverride == null ? null : num(raw.initiativeOverride),
    speedOverride: raw.speedOverride == null ? null : num(raw.speedOverride),
    perceptionOverride: raw.perceptionOverride == null ? null : num(raw.perceptionOverride),
    dracmas: Math.max(0, num(raw.dracmas)),
    humanMoney: Math.max(0, num(first(raw, "humanMoney", "money"))),
    humanMoneyCurrency: str(first(raw, "humanMoneyCurrency", "currency"), "R$"),
    filiationSignatures: normalizeSignatures(raw.filiationSignatures, str(raw.filiation), report), abilityGroups: groups,
    legacyLegendEntries: legacyLegend.map((item, index) => normalizeAbility(item, "legend", index, report)), equipment: arr(raw.equipment).map((item, index) => normalizeEquipment(item, index, report)), effects: arr(raw.effects).map(normalizeEffect), personality,
  };
  const migrated = migrateSheet(base, legacy, report);
  const derived = deriveStats(migrated);
  migrated.hp = Math.min(migrated.hp, derived.hpMax.value);
  migrated.mana = Math.min(migrated.mana, derived.manaMax.value);
  if (derived.resource) migrated.divineResource = clampResource(migrated.divineResource, derived.resource);
  else migrated.divineResource = Math.max(0, migrated.divineResource);
  // Fichas antigas recebem as habilidades do livro que ainda não tinham (sem duplicar o que já cadastraram).
  if (legacy.version < SHEET_VERSION) {
    const synced = syncAbilities(migrated);
    migrated.abilityGroups = synced.abilityGroups;
    if (synced.added.length) note(report, `habilidades: ${synced.added.length} do livro acrescentadas (${synced.added.slice(0, 6).join(", ")}${synced.added.length > 6 ? "…" : ""})`);
  }
  migrated.importReport = report;
  return { sheet: migrated, report, recognized };
}
