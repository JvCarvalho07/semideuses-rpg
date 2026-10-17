// Carrega as habilidades do livro na ficha (Dom e base da filiação, Caminho, origem e traço do antecedente).
// Só usa `import type` de ./model para rodar nos testes do Node.
import type { Ability, AbilityCategory } from "./model";
import { BACKGROUND_TRAITS, FILIATION_ABILITIES, ORIGIN_ABILITIES, PATH_ABILITIES, type OfficialAbility } from "./officialAbilities.ts";
import { backgroundName, normalizeLabel, originKind } from "./rules.ts";

type Groups = Record<AbilityCategory, Ability[]>;
export type AbilitySheet = { level: number; filiation: string; origin: string; background: string; pathName: string; abilityGroups: Groups };

/** O Legado só ganha a habilidade base de nível 1 (e a Marca do Herói); as de Caminho chegam mais tarde (5/9/14/19). */
const LEGACY_PATH_LEVELS: Record<number, number> = { 3: 5, 7: 9, 12: 14, 17: 19 };

export function pathNames(filiation: string): string[] {
  return Object.keys(PATH_ABILITIES[filiation] ?? {});
}

/** Reconhece o Caminho digitado ("Caminho do Veterano" ou só "Veterano"). */
export function findPath(filiation: string, text: string): string | undefined {
  const key = normalizeLabel(text).replace(/^caminho(d[aoe]s?|de)?/, "");
  if (!key) return undefined;
  return pathNames(filiation).find((name) => normalizeLabel(name).replace(/^caminho(d[aoe]s?|de)?/, "") === key);
}

type Desired = Record<"filiation" | "path" | "abilities", OfficialAbility[]>;

function desiredAbilities(sheet: AbilitySheet): Desired {
  const kind = originKind(sheet.origin);
  const desired: Desired = { filiation: [], path: [], abilities: [] };
  const hasFiliation = kind === "greek" || kind === "legacy";

  if (hasFiliation && FILIATION_ABILITIES[sheet.filiation]) {
    const base = FILIATION_ABILITIES[sheet.filiation];
    desired.filiation = kind === "legacy" ? base.filter((item) => item.level === 1 || item.name === "Marca do Herói") : base;
    const path = findPath(sheet.filiation, sheet.pathName);
    if (path) {
      const items = PATH_ABILITIES[sheet.filiation][path];
      desired.path = kind === "legacy" ? items.map((item) => ({ ...item, level: LEGACY_PATH_LEVELS[item.level] ?? item.level })) : items;
    }
  }
  if (kind !== "greek") desired.abilities.push(...ORIGIN_ABILITIES[kind]);
  const background = backgroundName(sheet.background);
  if (background && BACKGROUND_TRAITS[background]) desired.abilities.push(BACKGROUND_TRAITS[background]);
  return desired;
}

const INDEX = new Map<string, OfficialAbility>();
for (const list of Object.values(FILIATION_ABILITIES)) for (const item of list) INDEX.set(item.id, item);
for (const byPath of Object.values(PATH_ABILITIES)) for (const list of Object.values(byPath)) for (const item of list) INDEX.set(item.id, item);
for (const list of Object.values(ORIGIN_ABILITIES)) for (const item of list) INDEX.set(item.id, item);
for (const item of Object.values(BACKGROUND_TRAITS)) INDEX.set(item.id, item);

function toAbility(item: OfficialAbility): Ability {
  return {
    id: item.id, name: item.name, level: item.level, rank: item.rank, cost: item.cost, activation: item.activation,
    range: "Pessoal", duration: item.duration, recharge: "Conforme descrição", description: item.description, notes: "",
    extra: { sourceId: item.id, selectedOptions: {}, custom: false, unlocked: true, official: true },
  };
}

/** Habilidade oficial que o jogador nunca editou (o nível pode variar: Legado e Caminho). */
function isPristine(ability: Ability): boolean {
  const official = INDEX.get(String(ability.extra?.sourceId ?? ability.id));
  return !!official && ability.extra?.official === true
    && ability.name === official.name && ability.rank === official.rank && ability.cost === official.cost
    && ability.activation === official.activation && ability.description === official.description;
}

export type SyncResult = { abilityGroups: Groups; added: string[]; removed: string[] };

/**
 * Deixa as listas de habilidades de acordo com filiação, Caminho, origem, antecedente e nível.
 * - Acrescenta o que falta (ignorando nomes que o jogador já cadastrou por conta própria).
 * - Retira só habilidades oficiais intactas que deixaram de valer (outra filiação, outro Caminho, nível menor).
 * - `fromLevel` limita o que é acrescentado a quem passou a valer depois desse nível (subida de nível).
 */
export function syncAbilities(sheet: AbilitySheet, options: { fromLevel?: number } = {}): SyncResult {
  const fromLevel = options.fromLevel ?? 0;
  const desired = desiredAbilities(sheet);
  const groups: Groups = { ...sheet.abilityGroups };
  const added: string[] = [];
  const removed: string[] = [];

  for (const category of ["filiation", "path", "abilities"] as const) {
    const wanted = desired[category].filter((item) => item.level <= sheet.level);
    const wantedIds = new Set(wanted.map((item) => item.id));
    const kept = groups[category].filter((ability) => {
      const sourceId = String(ability.extra?.sourceId ?? ability.id);
      if (isPristine(ability) && !wantedIds.has(sourceId)) {
        removed.push(ability.name);
        return false;
      }
      return true;
    });
    const knownIds = new Set(kept.map((ability) => String(ability.extra?.sourceId ?? ability.id)));
    const knownNames = new Set(kept.map((ability) => normalizeLabel(ability.name)));
    const fresh: Ability[] = [];
    for (const item of wanted) {
      if (item.level <= fromLevel) continue;
      const key = normalizeLabel(item.name);
      // "Marca do Herói — Ataque Extra" cadastrada pelo jogador já conta como a Marca do Herói.
      const sameName = knownNames.has(key) || (key.length >= 8 && [...knownNames].some((name) => name.startsWith(key)));
      if (knownIds.has(item.id) || sameName) continue;
      fresh.push(toAbility(item));
      added.push(item.name);
    }
    groups[category] = [...kept, ...fresh].sort((a, b) => a.level - b.level);
  }
  return { abilityGroups: groups, added, removed };
}
