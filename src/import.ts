import {
  FILIATIONS,
  INITIAL_SHEET,
  type Ability,
  type AbilityCategory,
  type AttributeKey,
  type CharacterSheet,
  type Equipment,
  type FiliationSignatureState,
  type ImportReport,
  type SignatureMove,
  type SignatureResource,
} from "./model";
import { ensureFiliationSignatures, makeOfficialState, signatureDefinition } from "./filiationSignatures";

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
  const text = `${str(raw.title)} ${str(raw.name)} ${str(raw.rules)}`.toLowerCase();
  return text.includes("armadura") ? "Armadura" : text.includes("escudo") ? "Escudo" : text.includes("espada") || text.includes("arma") ? "Arma" : "Outro";
}
function normalizeEquipment(rawValue: unknown, index: number, report: ImportReport): Equipment {
  const raw = dict(rawValue);
  const type = inferEquipmentType(raw);
  if (raw.type === undefined) note(report, `equipamentos: tipo inferido como ${type}`);
  if (raw.qty !== undefined && raw.quantity === undefined) note(report, "equipamentos: qty convertido em quantidade");
  return {
    id: str(raw.id, `equipment-${index + 1}`), name: str(first(raw, "name", "title")), type,
    quantity: Math.max(0, num(first(raw, "quantity", "qty"), 1)), equipped: bool(raw.equipped),
    armorClass: num(first(raw, "armorClass", "caBonus")), attack: str(raw.attack), damage: str(raw.damage),
    properties: str(first(raw, "properties", "rules", "description")), notes: str(raw.notes),
    extra: extras(raw, ["id", "name", "title", "type", "category", "quantity", "qty", "equipped", "armorClass", "caBonus", "attack", "damage", "properties", "rules", "description", "notes"]),
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
  const hpMax = Math.max(0, num(raw.hpMax));
  const manaMax = Math.max(0, num(raw.manaMax));
  const known = ["version", "avatarDataUrl", "name", "legendDestiny", "legacyLegendEntries", "filiation", "pathName", "origin", "race", "background", "player", "level", "hp", "hpMax", "hpTemp", "mana", "manaMax", "divineResource", "favor", "sustain", "castingAttribute", "castingDcOverride", "attributes", "saveProficiencies", "skillRanks", "speed", "initiativeExtra", "caExtra", "caOverride", "initiativeOverride", "speedOverride", "perceptionOverride", "dracmas", "humanMoney", "humanMoneyCurrency", "money", "currency", "filiationSignatures", "abilityGroups", "equipment", "personality", "importReport"];
  report.unknownFields.push(...Object.keys(raw).filter((key) => !known.includes(key)));
  const base: CharacterSheet = {
    ...INITIAL_SHEET, version: 3, avatarDataUrl: str(raw.avatarDataUrl), name: str(raw.name), legendDestiny: str(raw.legendDestiny),
    filiation: str(raw.filiation), pathName: str(raw.pathName), origin: str(raw.origin, legacyOrigin), background: str(raw.background), player: str(raw.player),
    level: Math.max(1, Math.floor(num(raw.level, 1))), hp: Math.min(hpMax, Math.max(0, num(raw.hp))), hpMax, hpTemp: Math.max(0, num(raw.hpTemp)),
    mana: Math.min(manaMax, Math.max(0, num(raw.mana))), manaMax, divineResource: Math.max(0, num(raw.divineResource)), favor: Math.max(0, Math.min(5, num(raw.favor))), sustain: Math.max(0, num(raw.sustain)),
    castingAttribute: ATTRIBUTES.includes(raw.castingAttribute as AttributeKey) ? raw.castingAttribute as AttributeKey : "sab", castingDcOverride: raw.castingDcOverride == null ? null : num(raw.castingDcOverride),
    attributes, saveProficiencies: arr(raw.saveProficiencies).filter((value): value is AttributeKey => ATTRIBUTES.includes(value as AttributeKey)), skillRanks: Object.fromEntries(Object.entries(dict(raw.skillRanks)).map(([key, value]) => [key, num(value)])),
    speed: num(raw.speed), initiativeExtra: num(raw.initiativeExtra), caExtra: num(raw.caExtra),
    caOverride: raw.caOverride == null ? null : num(raw.caOverride),
    initiativeOverride: raw.initiativeOverride == null ? null : num(raw.initiativeOverride),
    speedOverride: raw.speedOverride == null ? null : num(raw.speedOverride),
    perceptionOverride: raw.perceptionOverride == null ? null : num(raw.perceptionOverride),
    dracmas: Math.max(0, num(raw.dracmas)),
    humanMoney: Math.max(0, num(first(raw, "humanMoney", "money"))),
    humanMoneyCurrency: str(first(raw, "humanMoneyCurrency", "currency"), "R$"),
    filiationSignatures: normalizeSignatures(raw.filiationSignatures, str(raw.filiation), report), abilityGroups: groups,
    legacyLegendEntries: legacyLegend.map((item, index) => normalizeAbility(item, "legend", index, report)), equipment: arr(raw.equipment).map((item, index) => normalizeEquipment(item, index, report)), personality,
  };
  base.importReport = report;
  return { sheet: base, report, recognized };
}
