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
  name: string;
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
  attributes: Record<AttributeKey, number>;
  saveProficiencies: AttributeKey[];
  skillRanks: Record<string, number>;
  speed: number;
  initiativeExtra: number;
  caExtra: number;
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
  Zeus: { resource: "Cargas de Raio", max: 6, accent: "#4f86c6", light: "#a9d6f5" },
  Poseidon: { resource: "Maré", max: 6, accent: "#00a6a6", light: "#7de2d1" },
  Hades: { resource: "Almas", max: 10, accent: "#8174a8", light: "#c6b9e4" },
  Atena: { resource: "Comando", max: 10, accent: "#d6a84b", light: "#f2d58c" },
  Ares: { resource: "Fúria", max: 10, accent: "#d4483f", light: "#f0a06f" },
  Apolo: { resource: "Marca Solar", max: 6, accent: "#f0a62e", light: "#f8da73" },
  Hefesto: { resource: "Pontos de Máquina", max: 10, accent: "#e0672e", light: "#efa86f" },
  Hermes: { resource: "Ritmo", max: 10, accent: "#42a47b", light: "#91dbb8" },
  Afrodite: { resource: "Encanto", max: 10, accent: "#d35d7d", light: "#efadc0" },
  Deméter: { resource: "Crescimento", max: 8, accent: "#789c3d", light: "#bed687" },
  Dionísio: { resource: "Delírio", max: 10, accent: "#8e4aa5", light: "#c99cdc" },
  Ártemis: { resource: "Marca da Presa", max: 6, accent: "#6b8790", light: "#b9cdd0" },
  Hécate: { resource: "Pontos de Feitiço", max: 10, accent: "#6957b8", light: "#b8a8f0" },
  Íris: { resource: "Espectro", max: 6, accent: "#2ea4b7", light: "#80d4ce" },
  Nêmesis: { resource: "Dívidas", max: 10, accent: "#9a6b51", light: "#d8ad8f" },
  Hipnos: { resource: "Sonolência", max: 10, accent: "#6571c8", light: "#aeb5eb" },
  Morfeu: { resource: "Fios do Sonho", max: 8, accent: "#7f63ae", light: "#c4afe0" },
  Nike: { resource: "Ímpeto", max: 10, accent: "#d89225", light: "#f1c86f" },
  Tique: { resource: "Dados de Sorte", max: 6, accent: "#28a783", light: "#83d7b7" },
  Tânatos: { resource: "Marcas da Morte", max: 6, accent: "#59606b", light: "#aab0ba" },
  Éolo: { resource: "Ventania", max: 6, accent: "#4597b5", light: "#9bd3e3" },
  Circe: { resource: "Reagentes", max: 10, accent: "#b65a83", light: "#e5a5c2" },
  Perséfone: { resource: "Estação", max: 2, accent: "#a4656f", light: "#ddb0a6" },
  Hebe: { resource: "Néctar", max: 6, accent: "#49a58b", light: "#a3dcc8" },
  Eros: { resource: "Vínculos", max: 6, accent: "#c84f62", light: "#eda4ad" },
  Nyx: { resource: "Escuridão", max: 10, accent: "#55549b", light: "#a09fd1" },
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
  name: "",
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
  attributes: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
  saveProficiencies: [],
  skillRanks: {},
  speed: 0,
  initiativeExtra: 0,
  caExtra: 0,
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

