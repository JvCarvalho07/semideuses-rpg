import { SKILL_LIST, type ArmorCategory } from "./rules";

export type AttributeKey = "for" | "des" | "con" | "int" | "sab" | "car";
export type AbilityCategory = "abilities" | "filiation" | "path" | "skills" | "talents";

export type Ability = {
  id: string;
  name: string;
  level: number;
  rank: string;
  cost: string;
  activation: string;
  range: string;
  duration: string;
  recharge: string;
  description: string;
  notes?: string;
  extra?: Record<string, unknown>;
};

export type Equipment = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  equipped: boolean;
  armorClass: number;
  /** Leve soma DES; Média soma DES (máx. +2); Pesada é fixa. Vazio = armorClass já é a CA final. */
  armorCategory?: ArmorCategory | "";
  attack: string;
  damage: string;
  properties: string;
  notes: string;
  extra?: Record<string, unknown>;
};

export type FiliationSignatureState = {
  id: string;
  sourceId: string;
  title: string;
  rules: string;
  selectedOptions: Record<string, string>;
  notes: string;
  custom: boolean;
  extra?: Record<string, unknown>;
  summary?: string;
  resource?: SignatureResource;
  recovery?: string;
  costs?: string;
  moves?: SignatureMove[];
  officialSnapshot?: SignatureOfficialSnapshot;
};

export type SignatureResource = {
  name: string;
  current: number;
  /** Só a Maré de Poseidon passa de 0 para baixo (−3). */
  min?: number;
  max: number;
  unit: string;
};

export type SignatureMove = {
  id: string;
  name: string;
  cost: string;
  activation: string;
  description: string;
};

export type SignatureOfficialSnapshot = {
  sourceId: string;
  title: string;
  rules: string;
  pdfPage: number;
};

export type EffectKind = "Bênção" | "Maldição";

/** Bênção ou maldição em vigor sobre o personagem. Só as ativas contam nos números. */
export type Effect = {
  id: string;
  kind: EffectKind;
  name: string;
  /** Quem concedeu ou lançou (deus, monstro, item). */
  source: string;
  duration: string;
  description: string;
  active: boolean;
  /** Bônus (ou penalidade, se negativo) aplicados enquanto estiver ativa. */
  ca: number;
  initiative: number;
  speed: number;
  hpMax: number;
};

export type ImportReport = {
  adjustments: string[];
  unknownFields: string[];
};

export type CharacterSheet = {
  version: number;
  avatarDataUrl: string;
  name: string;
  legendDestiny: string;
  legacyLegendEntries?: Ability[];
  filiation: string;
  pathName: string;
  origin: string;
  background: string;
  player: string;
  level: number;
  hp: number;
  /** null = calculado pelo livro (Dado de Vida da filiação + CON). */
  hpMaxOverride: number | null;
  hpTemp: number;
  mana: number;
  /** null = calculado pelo livro (6 + Conjuração, depois 2 + Conjuração por nível). */
  manaMaxOverride: number | null;
  divineResource: number;
  /** null = teto do recurso calculado pelo livro. */
  resourceMaxOverride: number | null;
  favor: number;
  sustain: number;
  castingAttribute: AttributeKey;
  castingDcOverride: number | null;
  attributes: Record<AttributeKey, number>;
  saveProficiencies: AttributeKey[];
  /** Ajustes manuais por perícia (0 = sem treino, 1 = proficiente, 2 = especialista). Sem ajuste, vale o cálculo do livro. */
  /** Perícia do Dom que recebe Especialização (só para quem tem esse Dom). */
  domSkill: string;
  skillRankOverrides: Record<string, number>;
  initiativeExtra: number;
  caExtra: number;
  caOverride: number | null;
  initiativeOverride: number | null;
  speedOverride: number | null;
  perceptionOverride: number | null;
  dracmas: number;
  humanMoney: number;
  humanMoneyCurrency: string;
  filiationSignatures: Record<string, FiliationSignatureState[]>;
  abilityGroups: Record<AbilityCategory, Ability[]>;
  equipment: Equipment[];
  effects: Effect[];
  personality: {
    trait: string;
    ideal: string;
    bond: string;
    flaw: string;
    backgroundTrait: string;
    backgroundBond: string;
    appearance: string;
    history: string;
    notes: string;
  };
  importReport?: ImportReport;
};

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  for: "FOR",
  des: "DES",
  con: "CON",
  int: "INT",
  sab: "SAB",
  car: "CAR",
};

export const FILIATIONS = {
  Zeus: { accent: "#2f8cff", light: "#a8d8ff", deep: "#102a4f", secondary: "#f6c84f", mark: "Ζ" },
  Poseidon: { accent: "#00a8b5", light: "#83ebdf", deep: "#073849", secondary: "#2e73d2", mark: "Π" },
  Hades: { accent: "#7a5bd7", light: "#c6b3ff", deep: "#1d142e", secondary: "#3a2b55", mark: "Η" },
  Atena: { accent: "#d29a28", light: "#ffe08a", deep: "#433510", secondary: "#456f87", mark: "ΑΘ" },
  Ares: { accent: "#e24a34", light: "#ff9b75", deep: "#3a1115", secondary: "#761e22", mark: "ΑΡ" },
  Apolo: { accent: "#ffb21c", light: "#ffe384", deep: "#4c2c08", secondary: "#e15b2b", mark: "ΑΠ" },
  Hefesto: { accent: "#f46b2a", light: "#ffb07f", deep: "#3a1b10", secondary: "#5e3a32", mark: "ΗΦ" },
  Hermes: { accent: "#23b889", light: "#92efd0", deep: "#0d3d33", secondary: "#d6a837", mark: "ΕΡ" },
  Afrodite: { accent: "#e64d88", light: "#ffafd0", deep: "#40142d", secondary: "#8d4cc7", mark: "ΑΦ" },
  Deméter: { accent: "#78ad35", light: "#cce88b", deep: "#263a14", secondary: "#c58c2d", mark: "Δ" },
  Dionísio: { accent: "#9c49c9", light: "#dda3f2", deep: "#35143f", secondary: "#d44279", mark: "ΔΙ" },
  Ártemis: { accent: "#4c98a3", light: "#a9e0df", deep: "#17363b", secondary: "#a8bcc6", mark: "ΑΡ" },
  Hécate: { accent: "#6b55e8", light: "#bdb2ff", deep: "#201848", secondary: "#c24fc6", mark: "ΕΚ" },
  Íris: { accent: "#16b9c7", light: "#8ff0ea", deep: "#10404c", secondary: "#ed5e9e", mark: "Ι" },
  Nêmesis: { accent: "#b66b3f", light: "#eab28f", deep: "#382118", secondary: "#34404f", mark: "Ν" },
  Hipnos: { accent: "#5d75e8", light: "#b5c1ff", deep: "#1b234b", secondary: "#8568c8", mark: "Υ" },
  Morfeu: { accent: "#7958c7", light: "#c5b3ef", deep: "#24183f", secondary: "#3669a9", mark: "Μ" },
  Nike: { accent: "#e69b18", light: "#f5d574", deep: "#3a290d", secondary: "#277b6a", mark: "ΝΙ" },
  Tique: { accent: "#16a982", light: "#84e8c7", deep: "#0e3c33", secondary: "#e8aa32", mark: "Τ" },
  Tânatos: { accent: "#667181", light: "#b7c0cb", deep: "#171b20", secondary: "#2b3038", mark: "Θ" },
  Éolo: { accent: "#349dd0", light: "#afe6f5", deep: "#12354a", secondary: "#8ac8e3", mark: "ΑΙ" },
  Circe: { accent: "#c54c88", light: "#efa3cb", deep: "#3d1630", secondary: "#6d4bc4", mark: "Κ" },
  Perséfone: { accent: "#b45872", light: "#e9a4af", deep: "#3a1922", secondary: "#5f8f52", mark: "ΠΕ" },
  Hebe: { accent: "#27af8b", light: "#9ae5cf", deep: "#0c4034", secondary: "#efb542", mark: "ΗΒ" },
  Eros: { accent: "#e74462", light: "#ff9fac", deep: "#421420", secondary: "#ee8c43", mark: "Ε" },
  Nyx: { accent: "#4e55c7", light: "#969cf0", deep: "#15172e", secondary: "#202554", mark: "ΝΥ" },
} as const;

export const SKILLS: Array<[string, AttributeKey]> = SKILL_LIST.map(([name, key]) => [name, key]);

export const ABILITY_META: Record<AbilityCategory, { title: string; description: string }> = {
  abilities: { title: "Habilidades e traços", description: "Origem, antecedente e características gerais." },
  filiation: { title: "Habilidades de filiação", description: "Dom, assinatura e habilidades-base da divindade." },
  path: { title: "Caminho divino", description: "Progressão própria do caminho escolhido." },
  skills: { title: "Skills", description: "Técnicas criadas, treinadas ou adquiridas." },
  talents: { title: "Talentos", description: "Especializações e vantagens permanentes." },
};

let seed = 0;
export function makeId(prefix: string) {
  seed += 1;
  return `${prefix}-${Date.now()}-${seed}`;
}

const ability = (
  id: string,
  name: string,
  rank: string,
  cost: string,
  activation: string,
  description: string,
  level = 1,
): Ability => ({
  id, name, rank, cost, activation, description, level,
  range: "Pessoal", duration: "Instantânea", recharge: "Conforme descrição",
});

export const INITIAL_SHEET: CharacterSheet = {
  version: 4,
  avatarDataUrl: "",
  name: "",
  legendDestiny: "",
  filiation: "",
  pathName: "",
  origin: "",
  background: "",
  player: "",
  level: 1,
  hp: 0,
  hpMaxOverride: null,
  hpTemp: 0,
  mana: 0,
  manaMaxOverride: null,
  divineResource: 0,
  resourceMaxOverride: null,
  favor: 0,
  sustain: 0,
  castingAttribute: "sab",
  castingDcOverride: null,
  attributes: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
  saveProficiencies: [],
  domSkill: "",
  skillRankOverrides: {},
  initiativeExtra: 0,
  caExtra: 0,
  caOverride: null,
  initiativeOverride: null,
  speedOverride: null,
  perceptionOverride: null,
  dracmas: 0,
  humanMoney: 0,
  humanMoneyCurrency: "R$",
  filiationSignatures: {},
  abilityGroups: { abilities: [], filiation: [], path: [], skills: [], talents: [] },
  equipment: [],
  effects: [],
  personality: {
    trait: "",
    ideal: "",
    bond: "",
    flaw: "",
    backgroundTrait: "",
    backgroundBond: "",
    appearance: "",
    history: "",
    notes: "",
  },
};
