import { ASSETS } from "../assets";

export const EQUIPMENT_TYPES = ["Arma", "Armadura", "Escudo", "Ferramenta", "Acessório", "Relíquia", "Consumível", "Outro"];
export const RESOURCE_ASSETS = {
  health: `${import.meta.env.BASE_URL}assets/resource-vitality.webp`,
  mana: `${import.meta.env.BASE_URL}assets/resource-mana.webp`,
  divine: `${import.meta.env.BASE_URL}assets/resource-divine.webp`,
  texture: `${import.meta.env.BASE_URL}assets/resource-panel-texture.webp`,
} as const;
export const ABILITY_SECTION_ASSETS = {
  abilities: ASSETS.sections.abilities,
  filiation: ASSETS.sections.filiation,
  path: ASSETS.sections.path,
  skills: ASSETS.sections.skills,
  talents: ASSETS.sections.talents,
} as const;
export const ORIGIN_SUGGESTIONS = ["Semideus Grego", "Sátiro", "Ciclope", "Mortal Vidente", "Legado"];
export type PrintFormat = "A4" | "A3" | "A5";
export const LEGEND_CHOICES = [
  {
    value: "O Voto",
    title: "O Voto",
    description: "Sirva a um ideal eterno. O tempo deixa de tocar você, mas sua imortalidade passa a obedecer regras que não podem ser quebradas.",
  },
  {
    value: "Ascensão Menor",
    title: "Ascensão Menor",
    description: "Assuma um domínio órfão como espírito ou divindade menor. Você se torna imortal, mas deixa para trás a vida de herói mortal.",
  },
  {
    value: "Lenda Mortal",
    title: "Lenda Mortal",
    description: "Recuse a imortalidade. Sua vida continua finita, seus feitos permanecem e seu nome atravessa as gerações.",
  },
  {
    value: "Renascimento",
    title: "Renascimento",
    description: "Escolha viver novamente e buscar a Ilha dos Bem-Aventurados através de três vidas verdadeiramente heroicas.",
  },
] as const;
