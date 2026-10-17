// Regras do Livro do Jogador (3ª edição) em funções puras.
// Este arquivo só pode usar `import type` — assim o Node consegue rodar os testes direto.
import type { AttributeKey } from "./model";

export const ATTRIBUTE_KEYS: AttributeKey[] = ["for", "des", "con", "int", "sab", "car"];

export const SKILL_LIST: ReadonlyArray<readonly [string, AttributeKey]> = [
  ["Atletismo", "for"], ["Acrobacia", "des"], ["Furtividade", "des"],
  ["Prestidigitação", "des"], ["Saber Mítico", "int"], ["História", "int"],
  ["Investigação", "int"], ["Natureza", "int"], ["Religião", "int"],
  ["Intuição", "sab"], ["Lidar com Animais", "sab"], ["Medicina", "sab"],
  ["Percepção", "sab"], ["Sobrevivência", "sab"], ["Atuação", "car"],
  ["Enganação", "car"], ["Intimidação", "car"], ["Persuasão", "car"],
];

// ---------------------------------------------------------------------------
// Fórmulas e recursos
// ---------------------------------------------------------------------------

export type FormulaInput = { level: number; castMod: number; prof: number };
/** valor = floor((base + cast × Conjuração + level × nível + prof × proficiência) × mult); `steps` troca o valor por faixa de nível. */
export type Formula = { base?: number; cast?: number; level?: number; prof?: number; mult?: number; steps?: ReadonlyArray<readonly [number, number]> };

export function evalFormula(formula: Formula, input: FormulaInput): number {
  if (formula.steps) {
    const step = [...formula.steps].filter(([level]) => input.level >= level).pop();
    return step ? step[1] : 0;
  }
  const raw = (formula.base ?? 0) + (formula.cast ?? 0) * input.castMod + (formula.level ?? 0) * input.level + (formula.prof ?? 0) * input.prof;
  return Math.max(0, Math.floor(raw * (formula.mult ?? 1)));
}

export type ResourceSpec = {
  name: string;
  unit: string;
  min: number;
  max: Formula;
  /** Valor no início de um combate ou Descanso (quando fixo). */
  start?: Formula;
  /** Fúria: começa igual aos PV já perdidos. */
  startFromHpLost?: boolean;
  /** O livro não fixa um teto: o valor pode passar do máximo calculado. */
  softMax?: boolean;
  note: string;
};

const fixed = (value: number): Formula => ({ base: value });
const perCast: Formula = { cast: 1 };

/** Capítulo 5 — o recurso de cada Assinatura. `null` = a filiação não usa um contador próprio. */
export const FILIATION_RESOURCES: Record<string, ResourceSpec | null> = {
  Zeus: { name: "Cargas", unit: "cargas", min: 0, max: fixed(5), start: fixed(1), note: "+1 no início de cada turno em combate (máx. 5). Começa o combate com 1 (2 sob céu aberto ou tempestade). Some após 1 minuto fora de combate." },
  Poseidon: { name: "Maré", unit: "níveis", min: -3, max: fixed(3), start: fixed(0), note: "Vai de −3 (Baixa) a +3 (Alta) e começa em 0 a cada combate. Uma vez por turno, de graça, suba ou desça 1." },
  Hades: { name: "Almas", unit: "almas", min: 0, max: { base: 3, cast: 1 }, start: fixed(0), note: "+1 quando um inimigo morre a até 12 m (máx. 3 + Conjuração). Zera no fim do combate." },
  Atena: { name: "Comando", unit: "pontos", min: 0, max: { base: 2, cast: 1, mult: 2 }, start: { base: 2, cast: 1 }, note: "Começa em 2 + Conjuração; o teto é o dobro disso. +1 no início de cada turno seu e +1 quando um aliado acerta um inimigo marcado por você." },
  Ares: { name: "Fúria", unit: "pontos", min: 0, max: fixed(10), startFromHpLost: true, note: "Começa cada combate igual aos PV já perdidos. +1 ao sofrer dano; +2 ao causar crítico ou derrubar um inimigo." },
  Apolo: null,
  Hefesto: { name: "Pontos de Máquina", unit: "pontos", min: 0, max: { base: 1, level: 0.5 }, start: { base: 1, level: 0.5 }, note: "1 + metade do nível, reconfigurados no Descanso. Os dispositivos custam Pontos em vez de MP." },
  Hermes: { name: "Ritmo", unit: "fichas", min: 0, max: { prof: 1, cast: 1 }, start: fixed(0), note: "+1 ao mover 6 m ou mais e +1 ao fazer um ataque ou habilidade (máx. proficiência + Conjuração)." },
  Afrodite: { name: "Encanto", unit: "fichas", min: 0, max: perCast, start: perCast, softMax: true, note: "Começa igual à Conjuração e enche a cada combate. Cresce +1 quando um inimigo falha um TR contra você; o livro não fixa teto." },
  Deméter: { name: "Zonas de Crescimento", unit: "zonas", min: 0, max: { steps: [[1, 3], [11, 5]] }, start: fixed(0), note: "Você mantém até 3 zonas ao mesmo tempo (5 a partir do nível 11)." },
  Dionísio: null,
  Ártemis: null,
  Hécate: { name: "Pontos de Feitiço", unit: "pontos", min: 0, max: perCast, start: perCast, note: "Igual à Conjuração; recuperados no Descanso." },
  Íris: null,
  Nêmesis: { name: "Dívida", unit: "fichas", min: 0, max: fixed(5), start: fixed(0), note: "+1 ao sofrer dano de um inimigo, ser alvo de um crítico ou quando um aliado cai (máx. 5). Zera no fim do combate." },
  Hipnos: null,
  Morfeu: { name: "Fios de Sonho", unit: "fios", min: 0, max: perCast, start: fixed(0), note: "+1 ao acertar a mente de um inimigo (TR falho contra você), até o máximo igual à Conjuração." },
  Nike: { name: "Ímpeto", unit: "pontos", min: 0, max: fixed(6), start: fixed(0), softMax: true, note: "O grupo ganha 1 quando um aliado reduz um inimigo a 0 PV ou acerta um crítico. O livro não fixa teto." },
  Tique: { name: "Pontos de Sorte", unit: "pontos", min: 0, max: perCast, start: perCast, note: "Igual à Conjuração. Gaste 1 para rolar de novo um d20, seu ou de uma criatura a 9 m, e escolher." },
  Tânatos: null,
  Éolo: null,
  Circe: { name: "Reagentes", unit: "reagentes", min: 0, max: perCast, start: perCast, note: "Preparados no Descanso, iguais à Conjuração. Cada um é gasto sem MP." },
  Perséfone: null,
  Hebe: { name: "Vigor", unit: "pontos", min: 0, max: { level: 2 }, start: { level: 2 }, note: "2 × nível, recuperado no Descanso Longo (metade no Curto). Hebe não usa Mana." },
  Eros: { name: "Vínculos", unit: "vínculos", min: 0, max: perCast, start: fixed(0), note: "Você mantém no máximo tantos Vínculos quanto a Conjuração." },
  Nyx: null,
};

// ---------------------------------------------------------------------------
// Filiações e origens
// ---------------------------------------------------------------------------

export type HitDie = 4 | 6 | 8 | 10 | 12;
/** 1 = leves, 2 = médias, 3 = pesadas. */
export type ArmorTier = 1 | 2 | 3;
export type Profile = {
  hitDie: HitDie;
  casting: AttributeKey | null;
  saves: [AttributeKey, AttributeKey];
  armor: ArmorTier;
  shield: boolean;
  usesMana: boolean;
};
export type FiliationRule = Profile & { skills: [string, string, string] };

const P = (hitDie: HitDie, casting: AttributeKey, saves: [AttributeKey, AttributeKey], armor: ArmorTier, shield: boolean, skills: [string, string, string], usesMana = true): FiliationRule =>
  ({ hitDie, casting, saves, armor, shield, usesMana, skills });

/** Capítulo 5 — tabela de cada filiação (DV, Conjuração, resistências, armaduras e perícias). */
export const FILIATION_RULES: Record<string, FiliationRule> = {
  Zeus: P(10, "car", ["des", "car"], 2, true, ["Intimidação", "Persuasão", "História"]),
  Poseidon: P(10, "sab", ["for", "con"], 2, true, ["Atletismo", "Natureza", "Lidar com Animais"]),
  Hades: P(8, "car", ["int", "car"], 2, false, ["Religião", "Intimidação", "Furtividade"]),
  Atena: P(8, "int", ["int", "sab"], 2, true, ["História", "Investigação", "Saber Mítico"]),
  Ares: P(12, "for", ["for", "con"], 3, true, ["Atletismo", "Intimidação", "Sobrevivência"]),
  Apolo: P(8, "sab", ["des", "sab"], 1, false, ["Medicina", "Atuação", "Religião"]),
  Hefesto: P(10, "int", ["for", "con"], 3, true, ["Investigação", "Percepção", "Atletismo"]),
  Hermes: P(8, "car", ["des", "int"], 2, false, ["Prestidigitação", "Enganação", "Persuasão"]),
  Afrodite: P(6, "car", ["sab", "car"], 1, false, ["Persuasão", "Enganação", "Intuição"]),
  Deméter: P(8, "sab", ["con", "sab"], 2, false, ["Natureza", "Sobrevivência", "Medicina"]),
  Dionísio: P(6, "car", ["con", "car"], 1, false, ["Atuação", "Enganação", "Persuasão"]),
  Ártemis: P(8, "sab", ["des", "sab"], 1, false, ["Sobrevivência", "Furtividade", "Lidar com Animais"]),
  Hécate: P(6, "int", ["int", "sab"], 1, false, ["Saber Mítico", "Religião", "Investigação"]),
  Íris: P(6, "car", ["des", "car"], 1, false, ["Persuasão", "Percepção", "Atuação"]),
  Nêmesis: P(8, "sab", ["sab", "car"], 2, false, ["Intuição", "Intimidação", "Investigação"]),
  Hipnos: P(6, "sab", ["int", "sab"], 1, false, ["Medicina", "Intuição", "Furtividade"]),
  Morfeu: P(6, "car", ["int", "car"], 1, false, ["Atuação", "Enganação", "Intuição"]),
  Nike: P(8, "car", ["for", "car"], 2, false, ["Atletismo", "Persuasão", "Intimidação"]),
  Tique: P(8, "car", ["des", "car"], 1, false, ["Prestidigitação", "Enganação", "Percepção"]),
  Tânatos: P(8, "sab", ["con", "sab"], 2, false, ["Medicina", "Religião", "Intuição"]),
  Éolo: P(8, "des", ["des", "con"], 1, false, ["Acrobacia", "Percepção", "Sobrevivência"]),
  Circe: P(6, "int", ["int", "car"], 1, false, ["Natureza", "Saber Mítico", "Medicina"]),
  Perséfone: P(8, "sab", ["con", "sab"], 2, false, ["Natureza", "Religião", "Intuição"]),
  Hebe: P(8, "con", ["con", "car"], 2, false, ["Atletismo", "Acrobacia", "Persuasão"], false),
  Eros: P(6, "car", ["sab", "car"], 1, false, ["Intuição", "Atuação", "Furtividade"]),
  Nyx: P(8, "car", ["sab", "car"], 1, false, ["Furtividade", "Intimidação", "Saber Mítico"]),
};

export type OriginKind = "greek" | "satyr" | "cyclops" | "mortal" | "legacy";

export function normalizeLabel(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
}

/** Reconhece a origem a partir do texto livre do campo Origem. */
export function originKind(origin: string): OriginKind {
  const key = normalizeLabel(origin);
  if (key.includes("legado")) return "legacy";
  if (key.includes("satiro") || key.includes("fauno")) return "satyr";
  if (key.includes("ciclope")) return "cyclops";
  if (key.includes("mortal") || key.includes("vidente")) return "mortal";
  return "greek";
}

/** Heróis Além do Sangue — origens que não têm filiação própria. */
export const ORIGIN_PROFILES: Record<"satyr" | "cyclops" | "mortal", Profile> = {
  satyr: { hitDie: 8, casting: "sab", saves: ["des", "sab"], armor: 1, shield: false, usesMana: true },
  cyclops: { hitDie: 12, casting: "for", saves: ["for", "con"], armor: 3, shield: true, usesMana: false },
  mortal: { hitDie: 8, casting: null, saves: ["int", "car"], armor: 2, shield: false, usesMana: false },
};

export const MORTAL_RESOURCE: ResourceSpec = { name: "Pontos de Sorte", unit: "pontos", min: 0, max: { prof: 1 }, start: { prof: 1 }, note: "Iguais ao Bônus de Proficiência. Recupera 1 ao terminar um Descanso Curto." };

/** Cíclopes: a pele é armadura natural (+2 na CA sem armadura). */
export const CYCLOPS_NATURAL_ARMOR = 2;

/** Velocidade base do semideus (Cap. 3). */
export const BASE_SPEED = 6;
/** Dom de Hermes e de Éolo e Pés de Bode do Sátiro: +3 m. O Legado herda o Dom da filiação. */
const SPEED_BONUS: Record<string, number> = { Hermes: 3, Éolo: 3 };
const SATYR_SPEED_BONUS = 3;

const ALL_SKILLS: readonly string[] = SKILL_LIST.map(([name]) => name);
/** Dons que concedem Especialização em uma perícia à escolha (Cap. 5 e Heróis Além do Sangue). */
const DOM_SKILLS: Record<string, readonly string[]> = {
  Atena: ALL_SKILLS,
  Hermes: ["Prestidigitação", "Acrobacia"],
  Circe: ["Medicina", "Natureza"],
  Eros: ["Intuição", "Persuasão", "Enganação", "Intimidação", "Atuação"],
  Sátiro: ["Atletismo", "Acrobacia"],
};

const DIE_STEPS: HitDie[] = [4, 6, 8, 10, 12];
function lowerDie(die: HitDie): HitDie {
  return DIE_STEPS[Math.max(0, DIE_STEPS.indexOf(die) - 1)];
}

export type ResolvedProfile = {
  kind: OriginKind;
  profile: Profile | null;
  resource: ResourceSpec | null;
  skills: readonly string[];
  /** Legado: reservas e tetos pela metade (arredondado para cima) e MP reduzido. */
  diluted: boolean;
  naturalArmor: number;
  speedBonus: number;
  domSkillOptions: readonly string[];
};

export function filiationRule(filiation: string): FiliationRule | undefined {
  return Object.prototype.hasOwnProperty.call(FILIATION_RULES, filiation) ? FILIATION_RULES[filiation] : undefined;
}

export function resolveProfile(filiation: string, origin: string): ResolvedProfile {
  const kind = originKind(origin);
  if (kind === "satyr" || kind === "cyclops" || kind === "mortal") {
    return {
      kind,
      profile: ORIGIN_PROFILES[kind],
      resource: kind === "mortal" ? MORTAL_RESOURCE : null,
      skills: [],
      diluted: false,
      naturalArmor: kind === "cyclops" ? CYCLOPS_NATURAL_ARMOR : 0,
      speedBonus: kind === "satyr" ? SATYR_SPEED_BONUS : 0,
      domSkillOptions: kind === "satyr" ? DOM_SKILLS.Sátiro : [],
    };
  }
  const rule = filiationRule(filiation);
  const none = { skills: [], diluted: false, naturalArmor: 0, speedBonus: 0, domSkillOptions: [] as readonly string[] };
  if (!rule) return { kind, profile: null, resource: null, ...none };
  const resource = FILIATION_RESOURCES[filiation] ?? null;
  const inherited = { speedBonus: SPEED_BONUS[filiation] ?? 0, domSkillOptions: DOM_SKILLS[filiation] ?? [] };
  if (kind === "legacy") {
    return { kind, profile: { ...rule, hitDie: lowerDie(rule.hitDie) }, resource, ...none, diluted: true, ...inherited };
  }
  return { kind, profile: rule, resource, ...none, skills: rule.skills, ...inherited };
}

// ---------------------------------------------------------------------------
// Antecedentes (Cap. 3): cada um concede 3 perícias
// ---------------------------------------------------------------------------

export const BACKGROUNDS: ReadonlyArray<{ name: string; skills: [string, string, string] }> = [
  { name: "Atleta", skills: ["Atletismo", "Acrobacia", "Intimidação"] },
  { name: "Órfão de Rua", skills: ["Furtividade", "Enganação", "Sobrevivência"] },
  { name: "Estudante Prodígio", skills: ["Saber Mítico", "História", "Investigação"] },
  { name: "Filho de Família Rica", skills: ["Persuasão", "História", "Intuição"] },
  { name: "Imigrante", skills: ["Intuição", "Persuasão", "Sobrevivência"] },
  { name: "Artista", skills: ["Atuação", "Persuasão", "Intuição"] },
  { name: "Criminoso", skills: ["Furtividade", "Enganação", "Prestidigitação"] },
  { name: "Criança Soldado", skills: ["Atletismo", "Sobrevivência", "Intimidação"] },
  { name: "Culto Familiar", skills: ["Religião", "Saber Mítico", "Intuição"] },
  { name: "Sobrevivente", skills: ["Medicina", "Sobrevivência", "Intuição"] },
];

/** Nome canônico do antecedente (aceita acento, caixa e o começo do nome, como "Filho de Família"). */
export function backgroundName(background: string): string | undefined {
  const key = normalizeLabel(background);
  if (!key) return undefined;
  return BACKGROUNDS.find((entry) => {
    const name = normalizeLabel(entry.name);
    return key === name || (key.length >= 6 && (name.startsWith(key) || key.startsWith(name)));
  })?.name;
}

export function backgroundSkills(background: string): readonly string[] {
  const name = backgroundName(background);
  return name ? BACKGROUNDS.find((entry) => entry.name === name)!.skills : [];
}

const SKILL_BY_KEY = new Map(SKILL_LIST.map(([name]) => [normalizeLabel(name), name]));

/** Nome canônico da perícia (aceita variações de acento, caixa e espaços). */
export function canonicalSkill(label: string): string | undefined {
  return SKILL_BY_KEY.get(normalizeLabel(label));
}

/** Perícia vinda de duas fontes (filiação + antecedente) vira Especialização; nunca passa de 2. */
export function autoSkillRanks(filiationSkills: readonly string[], background: string, domSkill = "", domOptions: readonly string[] = []): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const name of [...filiationSkills, ...backgroundSkills(background)]) ranks[name] = Math.min(2, (ranks[name] ?? 0) + 1);
  const dom = canonicalSkill(domSkill);
  if (dom && domOptions.includes(dom)) ranks[dom] = 2; // "proficiência com Especialização"
  return ranks;
}

/** Mescla chaves de perícia que só diferem por acento/caixa (ex.: "sobrevivencia" e "Sobrevivência"), mantendo o maior nível. */
export function mergeSkillRanks(ranks: Record<string, number>): { ranks: Record<string, number>; changed: boolean } {
  const result: Record<string, number> = {};
  let changed = false;
  for (const [key, raw] of Object.entries(ranks)) {
    const canonical = canonicalSkill(key);
    const value = Math.max(0, Math.min(2, Math.floor(Number.isFinite(Number(raw)) ? Number(raw) : 0)));
    const target = canonical ?? key;
    if (target !== key) changed = true;
    if (target in result) changed = true;
    result[target] = Math.max(result[target] ?? 0, value);
    if (value !== raw) changed = true;
  }
  return { ranks: result, changed };
}

// ---------------------------------------------------------------------------
// Armaduras (Cap. 8)
// ---------------------------------------------------------------------------

export type ArmorCategory = "Leve" | "Média" | "Pesada";
export const ARMOR_CATEGORIES: ArmorCategory[] = ["Leve", "Média", "Pesada"];
const ARMOR_TIER: Record<ArmorCategory, ArmorTier> = { Leve: 1, Média: 2, Pesada: 3 };

/** Capítulo 8 — armaduras e escudos do equipamento básico. */
export const ARMOR_CATALOG: ReadonlyArray<{ name: string; type: "Armadura" | "Escudo"; category?: ArmorCategory; ac: number; properties: string }> = [
  { name: "Couro Comum", type: "Armadura", category: "Leve", ac: 11, properties: "Armadura leve. CA base 11 + modificador de DES." },
  { name: "Couro Reforçado", type: "Armadura", category: "Leve", ac: 12, properties: "Armadura leve. CA base 12 + modificador de DES." },
  { name: "Cota de Malha Leve", type: "Armadura", category: "Leve", ac: 13, properties: "Armadura leve. CA base 13 + modificador de DES." },
  { name: "Couro de Nemeia", type: "Armadura", category: "Leve", ac: 14, properties: "Armadura leve. CA base 14 + modificador de DES. Resistência (Cortante)." },
  { name: "Armadura de Escamas Míticas", type: "Armadura", category: "Leve", ac: 15, properties: "Armadura leve. CA base 15 + modificador de DES. Resistência (Perfurante)." },
  { name: "Cota de Malha", type: "Armadura", category: "Média", ac: 13, properties: "Armadura média. CA base 13 + modificador de DES, máximo +2." },
  { name: "Peitoral de Bronze", type: "Armadura", category: "Média", ac: 14, properties: "Armadura média. CA base 14 + modificador de DES, máximo +2. Intimidante." },
  { name: "Armadura Hoplita", type: "Armadura", category: "Média", ac: 15, properties: "Armadura média. CA base 15 + modificador de DES, máximo +2." },
  { name: "Armadura de Placas Parcial", type: "Armadura", category: "Média", ac: 16, properties: "Armadura média. CA base 16 + modificador de DES, máximo +2." },
  { name: "Armadura de Bronze Celestial", type: "Armadura", category: "Média", ac: 17, properties: "Armadura média. CA base 17 + modificador de DES, máximo +2. Divina, Furtiva." },
  { name: "Armadura de Placas Completa", type: "Armadura", category: "Pesada", ac: 17, properties: "Armadura pesada. CA fixa 17." },
  { name: "Armadura de Guerra Grega", type: "Armadura", category: "Pesada", ac: 18, properties: "Armadura pesada. CA fixa 18. Intimidante." },
  { name: "Armadura de Adamanto", type: "Armadura", category: "Pesada", ac: 19, properties: "Armadura pesada. CA fixa 19. Resistência (Concussivo)." },
  { name: "Armadura de Estígio", type: "Armadura", category: "Pesada", ac: 20, properties: "Armadura pesada. CA fixa 20. Divina." },
  { name: "Escudo de Madeira", type: "Escudo", ac: 1, properties: "+1 de CA. Básico; queima facilmente." },
  { name: "Escudo de Bronze", type: "Escudo", ac: 2, properties: "+2 de CA. Padrão de combatente." },
  { name: "Escudo Hoplita", type: "Escudo", ac: 2, properties: "+2 de CA. Grande; fornece Cobertura Parcial estacionária." },
  { name: "Escudo de Bronze Celestial", type: "Escudo", ac: 3, properties: "+3 de CA. Divino; conta como mágico." },
  { name: "Escudo de Adamanto", type: "Escudo", ac: 3, properties: "+3 de CA. Resistência (Concussivo)." },
];

/** Lê "Armadura média. CA base 15 …" para sugerir categoria e valor base. */
export function inferArmor(properties: string): { category?: ArmorCategory; base?: number } {
  const category = /armadura\s+(leve|m[eé]dia|pesada)/i.exec(properties)?.[1]?.toLowerCase();
  const base = /CA\s+(?:base|fixa)\s+(\d+)/i.exec(properties)?.[1];
  return {
    category: category === "leve" ? "Leve" : category === "pesada" ? "Pesada" : category ? "Média" : undefined,
    base: base ? Number(base) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Ficha e números derivados
// ---------------------------------------------------------------------------

export type RuleEquipment = { type: string; equipped: boolean; armorClass: number; armorCategory?: ArmorCategory | "" };
/** Bênçãos e maldições: só as ativas entram nas contas. */
export type RuleEffect = { active: boolean; ca: number; initiative: number; speed: number; hpMax: number };

/** Equipar uma armadura ou um escudo guarda o anterior (só se veste um de cada). */
export function setEquipped<T extends { id: string; type: string; equipped: boolean }>(items: T[], id: string, equipped: boolean): T[] {
  const target = items.find((item) => item.id === id);
  if (!target) return items;
  const exclusive = equipped && (target.type === "Armadura" || target.type === "Escudo");
  return items.map((item) => {
    if (item.id === id) return { ...item, equipped };
    if (exclusive && item.type === target.type && item.equipped) return { ...item, equipped: false };
    return item;
  });
}

export type RuleSheet = {
  level: number;
  filiation: string;
  origin: string;
  background: string;
  attributes: Record<AttributeKey, number>;
  saveProficiencies: AttributeKey[];
  /** Perícia escolhida para a Especialização do Dom (Atena, Hermes, Circe, Eros, Sátiro). */
  domSkill: string;
  skillRankOverrides: Record<string, number>;
  castingAttribute: AttributeKey;
  castingDcOverride: number | null;
  hpMaxOverride: number | null;
  manaMaxOverride: number | null;
  resourceMaxOverride: number | null;
  hp: number;
  divineResource: number;
  speedOverride: number | null;
  initiativeExtra: number;
  initiativeOverride: number | null;
  caExtra: number;
  caOverride: number | null;
  perceptionOverride: number | null;
  equipment: RuleEquipment[];
  effects: RuleEffect[];
};

export function modifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function signed(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function proficiency(level: number) {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

/** Bônus de Reflexos de TDAH: já faz parte da Iniciativa de todos os semideuses (Cap. 2). */
export const INITIATIVE_BASE_BONUS = 2;

/** PV máximo: DV máximo + CON no nível 1; depois média do DV (arredondada para cima) + CON por nível. */
export function maxHpForDie(hitDie: number, level: number, conMod: number): number {
  const perLevel = Math.max(1, hitDie / 2 + 1 + conMod);
  return Math.max(1, hitDie + conMod) + (Math.max(1, level) - 1) * perLevel;
}

export function autoMaxHp(filiation: string, level: number, conMod: number, origin = ""): number | null {
  const profile = resolveProfile(filiation, origin).profile;
  return profile ? maxHpForDie(profile.hitDie, level, conMod) : null;
}

/** MP máximo: 6 + Conjuração no nível 1, depois 2 + Conjuração por nível. Legado: 4 + Conj. e 1 + Conj. por nível. Sem Mana: 0. */
export function autoMaxMana(level: number, castingMod: number, mode: "full" | "reduced" | "none" = "full"): number {
  if (mode === "none") return 0;
  const [first, step] = mode === "reduced" ? [4, 1] : [6, 2];
  return Math.max(0, first + castingMod) + (Math.max(1, level) - 1) * Math.max(0, step + castingMod);
}

export type ArmorClassContext = Pick<RuleSheet, "equipment" | "caExtra"> & { naturalArmor?: number };

/** CA com as categorias do Cap. 8. Armadura sem categoria mantém o comportamento antigo (valor final). */
export function armorClassFor(sheet: ArmorClassContext, desMod: number) {
  // Armadura equipada com valor 0 é um cadastro incompleto: não derruba a CA para 0.
  const armors = sheet.equipment.filter((item) => item.equipped && item.type === "Armadura" && item.armorClass > 0);
  const values = armors.map((item) => {
    if (item.armorCategory === "Leve") return item.armorClass + desMod;
    if (item.armorCategory === "Média") return item.armorClass + Math.min(2, desMod);
    return item.armorClass;
  });
  const base = values.length ? Math.max(...values) : 10 + desMod + (sheet.naturalArmor ?? 0);
  const bonus = sheet.equipment.filter((item) => item.equipped && item.type !== "Armadura").reduce((sum, item) => sum + item.armorClass, 0);
  return base + bonus + sheet.caExtra;
}

export type ArmorWarning = { index: number; message: string };

export type Derived = {
  prof: number;
  mods: Record<AttributeKey, number>;
  kind: OriginKind;
  profile: Profile | null;
  hpMax: { auto: number | null; value: number; overridden: boolean };
  manaMax: { auto: number; value: number; overridden: boolean };
  usesMana: boolean;
  resource: null | { spec: ResourceSpec; min: number; max: number; autoMax: number; overridden: boolean; start: number; clamp: boolean };
  armorClass: { auto: number; value: number };
  initiative: { auto: number; value: number };
  speed: { auto: number; value: number };
  perception: { auto: number; value: number };
  castingModifier: number;
  castingAttackBonus: number;
  castingDc: { auto: number; value: number };
  saves: Record<AttributeKey, { trained: boolean; bonus: number }>;
  skills: Array<{ name: string; attribute: AttributeKey; rank: number; autoRank: number; overridden: boolean; bonus: number }>;
  armorWarnings: ArmorWarning[];
  domSkillOptions: readonly string[];
  /** Soma dos bônus das bênçãos e maldições ativas (já incluídos em CA, iniciativa, deslocamento e PV máximo). */
  effects: { ca: number; initiative: number; speed: number; hpMax: number };
};

export function deriveStats(sheet: RuleSheet): Derived {
  const prof = proficiency(sheet.level);
  const mods = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, modifier(sheet.attributes[key])])) as Record<AttributeKey, number>;
  const castingModifier = mods[sheet.castingAttribute];
  const resolved = resolveProfile(sheet.filiation, sheet.origin);
  const formulaInput: FormulaInput = { level: sheet.level, castMod: castingModifier, prof };

  const effects = sheet.effects.filter((effect) => effect.active).reduce(
    (sum, effect) => ({ ca: sum.ca + effect.ca, initiative: sum.initiative + effect.initiative, speed: sum.speed + effect.speed, hpMax: sum.hpMax + effect.hpMax }),
    { ca: 0, initiative: 0, speed: 0, hpMax: 0 },
  );
  const autoHp = resolved.profile ? maxHpForDie(resolved.profile.hitDie, sheet.level, mods.con) : null;
  const hpMaxValue = (sheet.hpMaxOverride ?? autoHp ?? 0) + effects.hpMax;
  const usesMana = resolved.profile ? resolved.profile.usesMana : true;
  const autoMana = autoMaxMana(sheet.level, castingModifier, !usesMana ? "none" : resolved.diluted ? "reduced" : "full");
  const manaMaxValue = sheet.manaMaxOverride ?? autoMana;

  let resource: Derived["resource"] = null;
  if (resolved.resource) {
    const spec = resolved.resource;
    const raw = evalFormula(spec.max, formulaInput);
    const autoMax = resolved.diluted ? Math.ceil(raw / 2) : raw;
    const max = sheet.resourceMaxOverride ?? autoMax;
    const rawStart = spec.startFromHpLost ? Math.max(0, hpMaxValue - sheet.hp) : spec.start ? evalFormula(spec.start, formulaInput) : 0;
    const start = Math.min(max, resolved.diluted && spec.start ? Math.ceil(rawStart / 2) : rawStart);
    resource = { spec, min: spec.min, max, autoMax, overridden: sheet.resourceMaxOverride !== null, start: Math.max(spec.min, start), clamp: !spec.softMax };
  }

  const autoArmor = armorClassFor({ equipment: sheet.equipment, caExtra: sheet.caExtra, naturalArmor: resolved.naturalArmor }, mods.des) + effects.ca;
  const autoInitiative = mods.des + INITIATIVE_BASE_BONUS + sheet.initiativeExtra + effects.initiative;

  const autoRanks = autoSkillRanks(resolved.skills, sheet.background, sheet.domSkill, resolved.domSkillOptions);
  const skills = SKILL_LIST.map(([name, attribute]) => {
    const autoRank = autoRanks[name] ?? 0;
    const override = sheet.skillRankOverrides[name];
    const rank = override ?? autoRank;
    return { name, attribute, rank, autoRank, overridden: override !== undefined, bonus: mods[attribute] + prof * rank };
  });
  const perceptionRank = skills.find((skill) => skill.name === "Percepção")?.rank ?? 0;
  const autoPerception = 10 + mods.sab + prof * perceptionRank;
  const autoDc = 8 + castingModifier + prof;

  const armorWarnings: ArmorWarning[] = [];
  const profile = resolved.profile;
  if (profile) {
    sheet.equipment.forEach((item, index) => {
      if (!item.equipped) return;
      if (item.type === "Armadura" && item.armorCategory && ARMOR_TIER[item.armorCategory] > profile.armor) {
        armorWarnings.push({ index, message: `Sem proficiência em armadura ${item.armorCategory.toLowerCase()}: Desvantagem em testes de DES e FOR.` });
      }
      if (item.type === "Escudo" && !profile.shield) {
        armorWarnings.push({ index, message: "Sem proficiência em escudos: Desvantagem em testes de DES e FOR." });
      }
    });
  }

  return {
    prof,
    mods,
    kind: resolved.kind,
    profile,
    hpMax: { auto: autoHp, value: Math.max(0, hpMaxValue), overridden: sheet.hpMaxOverride !== null },
    manaMax: { auto: autoMana, value: Math.max(0, manaMaxValue), overridden: sheet.manaMaxOverride !== null },
    usesMana,
    resource,
    armorClass: { auto: autoArmor, value: sheet.caOverride ?? autoArmor },
    initiative: { auto: autoInitiative, value: sheet.initiativeOverride ?? autoInitiative },
    speed: { auto: BASE_SPEED + resolved.speedBonus + effects.speed, value: sheet.speedOverride ?? BASE_SPEED + resolved.speedBonus + effects.speed },
    perception: { auto: autoPerception, value: sheet.perceptionOverride ?? autoPerception },
    castingModifier,
    castingAttackBonus: castingModifier + prof,
    castingDc: { auto: autoDc, value: sheet.castingDcOverride ?? autoDc },
    saves: Object.fromEntries(ATTRIBUTE_KEYS.map((key) => {
      const trained = sheet.saveProficiencies.includes(key);
      return [key, { trained, bonus: mods[key] + (trained ? prof : 0) }];
    })) as Derived["saves"],
    skills,
    armorWarnings,
    domSkillOptions: resolved.domSkillOptions,
    effects,
  };
}

/** Ao escolher filiação ou origem: atributo de Conjuração e testes de resistência do livro (null = nada a preencher). */
export function profileDefaults(filiation: string, origin: string): { casting: AttributeKey | null; saves: AttributeKey[] } | null {
  const profile = resolveProfile(filiation, origin).profile;
  return profile ? { casting: profile.casting, saves: [...profile.saves] } : null;
}

/** Limita o recurso ao intervalo permitido (e ao máximo, se o livro fixa um teto). */
export function clampResource(value: number, resource: NonNullable<Derived["resource"]>): number {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return Math.max(resource.min, resource.clamp ? Math.min(resource.max, rounded) : rounded);
}
