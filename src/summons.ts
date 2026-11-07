// Invocações: criaturas que algumas habilidades trazem para o combate.
// Perfil padrão do livro (Cap. 5, "Criaturas invocadas"): PV = 4 × metade do nível
// (para cima), CA 13, 9 m, ataque com o bônus de Conjuração, 1d8 + Conjuração,
// TR com o Bônus de Proficiência; no máximo duas ao mesmo tempo.
// Sem imports de runtime, para o Node rodar os testes direto.

export type Summon = {
  id: string;
  name: string;
  /** Habilidade que trouxe a criatura. */
  source: string;
  hp: number;
  hpMax: number;
  ca: number;
  /** Metros; 0 = imóvel. */
  speed: number;
  attackBonus: number;
  damage: string;
  damageType: string;
  save: number;
  notes: string;
  /** Nome da arte da carta (public/assets/summons/card-<art>-480.webp e -800.webp). */
  art: string;
};

export type SummonPreset = {
  /** Habilidade do livro (sourceId) que invoca. */
  sourceId: string;
  /** Nome da habilidade, para fichas antigas sem sourceId. */
  ability: string;
  creature: string;
  /** Arte da carta. */
  art: string;
  /** "morto-vivo", "autômato"… mostrado embaixo do nome. */
  kind: string;
  count?: number;
  damageType: string;
  notes?: string;
  /** Ajustes ao perfil padrão. */
  tweak?: (base: SummonStats, level: number) => Partial<SummonStats>;
};

export type SummonStats = Pick<Summon, "hpMax" | "ca" | "speed" | "attackBonus" | "damage" | "save">;

/** Perfil padrão do livro para "ND ~1/4 do seu nível". */
export function baseSummonStats(level: number, castingModifier: number, proficiency: number): SummonStats {
  const lv = Math.max(1, Math.floor(level));
  const mod = Math.trunc(castingModifier);
  return {
    hpMax: 4 * Math.ceil(lv / 2),
    ca: 13,
    speed: 9,
    attackBonus: mod + proficiency,
    damage: mod === 0 ? "1d8" : `1d8 ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}`,
    save: proficiency,
  };
}

export const SUMMON_PRESETS: SummonPreset[] = [
  { sourceId: "hades-erguer-morto", ability: "Erguer Morto", creature: "Servo morto-vivo", art: "servo", kind: "morto-vivo", damageType: "Necrótico", notes: "Até o fim do combate. Gaste 1 Alma para erguer dois de uma vez." },
  { sourceId: "hades-morte-comando-funebre", ability: "Comando Fúnebre", creature: "Esqueleto", art: "esqueleto", kind: "morto-vivo", damageType: "Necrótico", notes: "Age na própria Iniciativa. Máximo de 2 erguidos por esta habilidade. 1 Alma: +1d6 nos ataques até o seu próximo turno." },
  { sourceId: "hefesto-automato-automato-de-bronze", ability: "Autômato de Bronze", creature: "Autômato de Bronze", art: "automato", kind: "autômato", damageType: "Concussivo" },
  { sourceId: "hefesto-torreta", ability: "Torreta", creature: "Torreta", art: "torreta", kind: "dispositivo", damageType: "Perfurante", notes: "Imóvel. Atira sozinha por 1 minuto, até 18 m.", tweak: () => ({ speed: 0, damage: "2d8" }) },
  { sourceId: "hecate-necromancia-servo-espectral", ability: "Servo Espectral", creature: "Cão das sombras", art: "cao", kind: "espírito", damageType: "Necrótico", notes: "Obedece até o fim do combate." },
  { sourceId: "artemis-irmandade-cacadora-espectral", ability: "Caçadora Espectral", creature: "Caçadora espectral", art: "cacadora", kind: "espírito", damageType: "Perfurante" },
  { sourceId: "artemis-irmandade-matilha", ability: "Matilha", creature: "Caçadora espectral", art: "cacadora", kind: "espírito", count: 3, damageType: "Perfurante", notes: "Flanqueiam: aliados têm Vantagem contra quem elas cercam." },
  { sourceId: "artemis-irmandade-lobas-espectrais", ability: "Lobas Espectrais", creature: "Loba espectral", art: "loba", kind: "espírito", damageType: "Perfurante", notes: "TR de FOR ou Agarrado; seguem a presa marcada." },
  {
    sourceId: "poseidon-cavalos-corcel-das-ondas", ability: "Corcel das Ondas", creature: "Corcel das Ondas", art: "corcel", kind: "montaria", damageType: "Concussivo",
    notes: "Montaria Grande por 10 minutos. Maré Alta: investe e empurra o primeiro inimigo do caminho.",
    tweak: (_base, level) => ({ ca: 14, hpMax: 5 * Math.max(1, Math.floor(level)), speed: 18, damage: "2d8" }),
  },
];

export const ART_NAMES = ["servo", "esqueleto", "automato", "torreta", "cao", "cacadora", "loba", "corcel", "criatura"];

/** A habilidade da ficha que corresponde a uma invocação (para mostrar ação e custo). */
export function presetAbility<T extends AbilityLike>(abilities: ReadonlyArray<T>, preset: SummonPreset): T | undefined {
  return abilities.find((ability) => sourceOf(ability) === preset.sourceId || fold(ability.name ?? "") === fold(preset.ability));
}

/** Habilidades que deixam ter mais criaturas ao mesmo tempo. */
const LIMIT_RAISERS: Record<string, number> = { "hades-morte-horda": 5 };

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type AbilityLike = { name?: string; level?: number; extra?: Record<string, unknown> };

function sourceOf(ability: AbilityLike) {
  return String(ability.extra?.sourceId ?? "");
}

function reachable(ability: AbilityLike, level: number) {
  return !ability.level || ability.level <= level;
}

/** Invocações que a ficha já pode usar, pelas habilidades dela. */
export function availablePresets(abilities: ReadonlyArray<AbilityLike>, level: number): SummonPreset[] {
  return SUMMON_PRESETS.filter((preset) => abilities.some((ability) => reachable(ability, level)
    && (sourceOf(ability) === preset.sourceId || fold(ability.name ?? "") === fold(preset.ability))));
}

/** Quantas criaturas a ficha mantém ao mesmo tempo (2 pelo livro; Horda sobe para 5). */
export function summonLimit(abilities: ReadonlyArray<AbilityLike>, level: number): number {
  let limit = 2;
  for (const ability of abilities) {
    const raise = LIMIT_RAISERS[sourceOf(ability)] ?? (fold(ability.name ?? "") === "horda" ? 5 : 0);
    if (raise && reachable(ability, level)) limit = Math.max(limit, raise);
  }
  return limit;
}

function summonId() {
  return `invocacao-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeSummons(preset: SummonPreset | null, level: number, castingModifier: number, proficiency: number, existing: ReadonlyArray<Summon> = []): Summon[] {
  const base = baseSummonStats(level, castingModifier, proficiency);
  const stats = { ...base, ...(preset?.tweak?.(base, level) ?? {}) };
  const creature = preset?.creature ?? "Criatura";
  const count = preset?.count ?? 1;
  const taken = existing.filter((summon) => summon.name.startsWith(creature)).length;
  return Array.from({ length: count }, (_, index) => {
    const n = taken + index + 1;
    return {
      id: summonId(),
      name: n > 1 ? `${creature} ${n}` : creature,
      source: preset?.ability ?? "",
      hp: stats.hpMax,
      ...stats,
      damageType: preset?.damageType ?? "",
      notes: preset?.notes ?? "",
      art: preset?.art ?? "criatura",
    };
  });
}

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Aceita o que vier do JSON e devolve invocações válidas. */
export function normalizeSummons(value: unknown): Summon[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const hpMax = Math.max(1, Math.round(num(item.hpMax, 1)));
      return {
        id: text(item.id) || summonId(),
        name: text(item.name) || "Criatura",
        source: text(item.source),
        hp: Math.min(hpMax, Math.max(0, Math.round(num(item.hp, hpMax)))),
        hpMax,
        ca: Math.round(num(item.ca, 13)),
        speed: Math.max(0, num(item.speed, 9)),
        attackBonus: Math.round(num(item.attackBonus, 0)),
        damage: text(item.damage),
        damageType: text(item.damageType),
        save: Math.round(num(item.save, 0)),
        notes: text(item.notes),
        art: ART_NAMES.includes(text(item.art)) ? text(item.art) : "criatura",
      };
    });
}

export type BestiaryTrait = { name: string; text: string };
export type BestiaryEntry = {
  /** Criatura do Livro do Mestre que serve de base. */
  base: string;
  type: string;
  /** FOR, DES, CON, INT, SAB, CAR; null = o livro não traz. */
  attributes: [number | null, number | null, number | null, number | null, number | null, number | null];
  defenses: string;
  traits: BestiaryTrait[];
};

/** Atributos, defesas e traços do Livro do Mestre (Bestiário). Os números de combate seguem a regra de invocação do Livro do Jogador. */
export const BESTIARY: Record<string, BestiaryEntry> = {
  esqueleto: {
    base: "Esqueleto Guerreiro do Érebo", type: "Morto-vivo",
    attributes: [14, 13, 14, 6, 8, 5],
    defenses: "Imune a Veneno e Psíquico; Enfeitiçado, Apavorado e Envenenado. Vulnerável a dano Divino.",
    traits: [
      { name: "Formação Cerrada", text: "+1 na CA enquanto estiver adjacente a outro esqueleto." },
      { name: "Instinto de Combate", text: "Ataca o alvo mais próximo que o atacou; obedece ordens simples de quem o ergueu." },
    ],
  },
  servo: {
    base: "Zumbi Antigo", type: "Morto-vivo",
    attributes: [18, 6, 20, 3, 6, 5],
    defenses: "Imune a Veneno; Exausto e Envenenado. Visão no Escuro 18 m.",
    traits: [{ name: "Implacável", text: "Nunca recua, nunca hesita, nunca para por ferimentos." }],
  },
  cao: {
    base: "Sombra Faminta", type: "Morto-vivo",
    attributes: [6, 14, 10, 8, 10, 8],
    defenses: "Imune a Frio e Necrótico; Agarrado, Caído e Paralisado. Visão no Escuro 18 m.",
    traits: [
      { name: "Senso de Vida", text: "Percebe sozinho criaturas vivas a até 18 m." },
      { name: "Vulnerabilidade à Luz", text: "Em Luz Plena, tem Desvantagem em ataques e testes." },
    ],
  },
  corcel: {
    base: "Hipocampo Selvagem", type: "Criatura",
    attributes: [18, 14, 14, 6, 12, 10],
    defenses: "Visão no Escuro 18 m.",
    traits: [
      { name: "Anfíbio", text: "Respira ar e água." },
      { name: "Reconhecimento Divino", text: "Filhos de Poseidon montam sem teste." },
    ],
  },
  loba: {
    base: "Lobo de Licaon", type: "Fera espectral",
    attributes: [16, null, null, null, null, null],
    defenses: "",
    traits: [{ name: "Faro Apurado", text: "Vantagem em Percepção pelo olfato." }],
  },
  automato: {
    base: "Mirmidão", type: "Constructo",
    attributes: [13, 12, 12, null, null, null],
    defenses: "Carapaça: resistência a Concussivo; imune a Veneno e Enfeitiçado.",
    traits: [],
  },
};
