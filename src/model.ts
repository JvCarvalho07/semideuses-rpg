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
};

export type Equipment = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  equipped: boolean;
  armorClass: number;
  attack: string;
  damage: string;
  properties: string;
  notes: string;
};

export type CharacterSheet = {
  version: number;
  avatarDataUrl: string;
  name: string;
  race: string;
  legendDestiny: string;
  legacyLegendEntries?: Ability[];
  filiation: string;
  pathName: string;
  origin: string;
  background: string;
  player: string;
  level: number;
  hp: number;
  hpMax: number;
  hpTemp: number;
  mana: number;
  manaMax: number;
  divineResource: number;
  favor: number;
  sustain: number;
  castingAttribute: AttributeKey;
  castingDcOverride: number | null;
  attributes: Record<AttributeKey, number>;
  saveProficiencies: AttributeKey[];
  skillRanks: Record<string, number>;
  speed: number;
  initiativeExtra: number;
  caExtra: number;
  dracmas: number;
  abilityGroups: Record<AbilityCategory, Ability[]>;
  equipment: Equipment[];
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
  Zeus: { resource: "Cargas de Raio", max: 6, accent: "#2f8cff", light: "#a8d8ff", deep: "#102a4f", secondary: "#f6c84f", mark: "Ζ" },
  Poseidon: { resource: "Maré", max: 6, accent: "#00a8b5", light: "#83ebdf", deep: "#073849", secondary: "#2e73d2", mark: "Π" },
  Hades: { resource: "Almas", max: 10, accent: "#7a5bd7", light: "#c6b3ff", deep: "#1d142e", secondary: "#3a2b55", mark: "Η" },
  Atena: { resource: "Comando", max: 10, accent: "#d29a28", light: "#ffe08a", deep: "#433510", secondary: "#456f87", mark: "ΑΘ" },
  Ares: { resource: "Fúria", max: 10, accent: "#e24a34", light: "#ff9b75", deep: "#3a1115", secondary: "#761e22", mark: "ΑΡ" },
  Apolo: { resource: "Marca Solar", max: 6, accent: "#ffb21c", light: "#ffe384", deep: "#4c2c08", secondary: "#e15b2b", mark: "ΑΠ" },
  Hefesto: { resource: "Pontos de Máquina", max: 10, accent: "#f46b2a", light: "#ffb07f", deep: "#3a1b10", secondary: "#5e3a32", mark: "ΗΦ" },
  Hermes: { resource: "Ritmo", max: 10, accent: "#23b889", light: "#92efd0", deep: "#0d3d33", secondary: "#d6a837", mark: "ΕΡ" },
  Afrodite: { resource: "Encanto", max: 10, accent: "#e64d88", light: "#ffafd0", deep: "#40142d", secondary: "#8d4cc7", mark: "ΑΦ" },
  Deméter: { resource: "Crescimento", max: 8, accent: "#78ad35", light: "#cce88b", deep: "#263a14", secondary: "#c58c2d", mark: "Δ" },
  Dionísio: { resource: "Delírio", max: 10, accent: "#9c49c9", light: "#dda3f2", deep: "#35143f", secondary: "#d44279", mark: "ΔΙ" },
  Ártemis: { resource: "Marca da Presa", max: 6, accent: "#4c98a3", light: "#a9e0df", deep: "#17363b", secondary: "#a8bcc6", mark: "ΑΡ" },
  Hécate: { resource: "Pontos de Feitiço", max: 10, accent: "#6b55e8", light: "#bdb2ff", deep: "#201848", secondary: "#c24fc6", mark: "ΕΚ" },
  Íris: { resource: "Espectro", max: 6, accent: "#16b9c7", light: "#8ff0ea", deep: "#10404c", secondary: "#ed5e9e", mark: "Ι" },
  Nêmesis: { resource: "Dívidas", max: 10, accent: "#b66b3f", light: "#eab28f", deep: "#382118", secondary: "#34404f", mark: "Ν" },
  Hipnos: { resource: "Sonolência", max: 10, accent: "#5d75e8", light: "#b5c1ff", deep: "#1b234b", secondary: "#8568c8", mark: "Υ" },
  Morfeu: { resource: "Fios do Sonho", max: 8, accent: "#7958c7", light: "#c5b3ef", deep: "#24183f", secondary: "#3669a9", mark: "Μ" },
  Nike: { resource: "Ímpeto", max: 10, accent: "#e69b18", light: "#f5d574", deep: "#3a290d", secondary: "#277b6a", mark: "ΝΙ" },
  Tique: { resource: "Dados de Sorte", max: 6, accent: "#16a982", light: "#84e8c7", deep: "#0e3c33", secondary: "#e8aa32", mark: "Τ" },
  Tânatos: { resource: "Marcas da Morte", max: 6, accent: "#667181", light: "#b7c0cb", deep: "#171b20", secondary: "#2b3038", mark: "Θ" },
  Éolo: { resource: "Ventania", max: 6, accent: "#349dd0", light: "#afe6f5", deep: "#12354a", secondary: "#8ac8e3", mark: "ΑΙ" },
  Circe: { resource: "Reagentes", max: 10, accent: "#c54c88", light: "#efa3cb", deep: "#3d1630", secondary: "#6d4bc4", mark: "Κ" },
  Perséfone: { resource: "Estação", max: 2, accent: "#b45872", light: "#e9a4af", deep: "#3a1922", secondary: "#5f8f52", mark: "ΠΕ" },
  Hebe: { resource: "Néctar", max: 6, accent: "#27af8b", light: "#9ae5cf", deep: "#0c4034", secondary: "#efb542", mark: "ΗΒ" },
  Eros: { resource: "Vínculos", max: 6, accent: "#e74462", light: "#ff9fac", deep: "#421420", secondary: "#ee8c43", mark: "Ε" },
  Nyx: { resource: "Escuridão", max: 10, accent: "#4e55c7", light: "#969cf0", deep: "#15172e", secondary: "#202554", mark: "ΝΥ" },
} as const;

export const SKILLS: Array<[string, AttributeKey]> = [
  ["Atletismo", "for"], ["Acrobacia", "des"], ["Furtividade", "des"],
  ["Prestidigitação", "des"], ["Saber Mítico", "int"], ["História", "int"],
  ["Investigação", "int"], ["Natureza", "int"], ["Religião", "int"],
  ["Intuição", "sab"], ["Lidar com Animais", "sab"], ["Medicina", "sab"],
  ["Percepção", "sab"], ["Sobrevivência", "sab"], ["Atuação", "car"],
  ["Enganação", "car"], ["Intimidação", "car"], ["Persuasão", "car"],
];

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
  version: 2,
  avatarDataUrl: "",
  name: "",
  race: "",
  legendDestiny: "",
  filiation: "",
  pathName: "",
  origin: "",
  background: "",
  player: "",
  level: 1,
  hp: 0,
  hpMax: 0,
  hpTemp: 0,
  mana: 0,
  manaMax: 0,
  divineResource: 0,
  favor: 0,
  sustain: 0,
  castingAttribute: "sab",
  castingDcOverride: null,
  attributes: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
  saveProficiencies: [],
  skillRanks: {},
  speed: 0,
  initiativeExtra: 0,
  caExtra: 0,
  dracmas: 0,
  abilityGroups: { abilities: [], filiation: [], path: [], skills: [], talents: [] },
  equipment: [],
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
