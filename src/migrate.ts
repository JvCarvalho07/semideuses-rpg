// Migração de fichas antigas (v3) para o formato v4. Só usa `import type` para rodar nos testes do Node.
import {
  armorClassFor,
  deriveStats,
  INITIATIVE_BASE_BONUS,
  inferArmor,
  mergeSkillRanks,
  modifier,
  type RuleSheet,
} from "./rules.ts";

export const SHEET_VERSION = 4;

export type MigratableSheet = RuleSheet & { version: number; equipment: Array<RuleSheet["equipment"][number] & { name: string; properties: string }> };
export type LegacyValues = {
  version: number;
  hpMax: number;
  manaMax: number;
  /** Deslocamento digitado na ficha antiga; 0 quando o arquivo traz `speedOverride` ou não informa. */
  speed: number;
  /** Perícias no formato antigo (nível final por perícia). null quando o arquivo já traz `skillRankOverrides`. */
  skillRanks: Record<string, number> | null;
};

function note(report: { adjustments: string[] }, message: string) {
  if (!report.adjustments.includes(message)) report.adjustments.push(message);
}

/** `hpMax`/`manaMax` só contam como valor manual quando o arquivo não traz as chaves de ajuste (fichas v3 ou escritas por IA). */
export function readLegacyValues(raw: Record<string, unknown>): LegacyValues {
  const positive = (value: unknown) => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);
  const version = Number(raw.version);
  const ranks = raw.skillRanks && typeof raw.skillRanks === "object" && !Array.isArray(raw.skillRanks) ? raw.skillRanks as Record<string, unknown> : {};
  return {
    version: Number.isFinite(version) ? Math.floor(version) : 3,
    hpMax: "hpMaxOverride" in raw ? 0 : positive(raw.hpMax),
    manaMax: "manaMaxOverride" in raw ? 0 : positive(raw.manaMax),
    speed: raw.speedOverride == null ? positive(raw.speed) : 0,
    skillRanks: "skillRankOverrides" in raw ? null : Object.fromEntries(Object.entries(ranks).map(([key, value]) => [key, Number(value)])),
  };
}

/**
 * Leva uma ficha já normalizada (campos com o formato certo) ao formato atual sem alterar o que o jogador vê:
 * iniciativa, CA, PV/MP máximos e perícias continuam com os mesmos números.
 */
export function migrateSheet<T extends MigratableSheet>(sheet: T, legacy: LegacyValues, report: { adjustments: string[] }): T {
  const next: T = { ...sheet, equipment: sheet.equipment.map((item) => ({ ...item })), skillRankOverrides: { ...sheet.skillRankOverrides } };
  const fromLegacy = legacy.version < SHEET_VERSION;

  const desMod = modifier(next.attributes.des);
  const oldArmorClass = armorClassFor(next, desMod);
  let equippedArmorFixed = false;
  for (const item of next.equipment) {
    if (item.type === "Escudo" && !item.armorClass) {
      // Espada cadastrada como escudo por engano.
      if (/\bespadas?\b/i.test(item.name)) {
        item.type = "Arma";
        note(report, `equipamentos: ${item.name} era um escudo sem bônus de CA e virou arma`);
        continue;
      }
      const bonus = /\+(\d+)\s*(?:à|de|na)?\s*CA\b/i.exec(item.properties)?.[1];
      if (bonus) {
        item.armorClass = Number(bonus);
        note(report, `equipamentos: ${item.name || "escudo"} ganhou o bônus de CA +${bonus} lido das propriedades`);
      }
      continue;
    }
    if (item.type !== "Armadura" || item.armorCategory) continue;
    const inferred = inferArmor(item.properties);
    if (!inferred.category) continue;
    item.armorCategory = inferred.category;
    if (!item.armorClass && inferred.base) {
      item.armorClass = inferred.base;
      if (item.equipped) equippedArmorFixed = true;
    }
    note(report, `equipamentos: ${item.name || "armadura"} reconhecida como armadura ${inferred.category.toLowerCase()}`);
  }

  if (fromLegacy) {
    // O "extra" da ficha antiga costumava fingir a armadura que não estava equipada. Se equipar uma delas
    // e zerar o extra reproduz exatamente a CA antiga, a ficha já sai arrumada.
    if (next.caOverride === null && next.caExtra !== 0) {
      const candidate = (next.equipment as MigratableSheet["equipment"]).find((item) => {
        if (item.type !== "Armadura" || item.equipped || !item.armorCategory || item.armorClass <= 0) return false;
        const trial = next.equipment.map((entry) => (entry === item ? { ...entry, equipped: true } : entry));
        return armorClassFor({ equipment: trial, caExtra: 0 }, desMod) === oldArmorClass;
      });
      if (candidate) {
        candidate.equipped = true;
        note(report, `CA: ${(candidate as { name?: string }).name || "a armadura"} foi equipada e o extra +${next.caExtra} zerado, mantendo a CA ${oldArmorClass}`);
        next.caExtra = 0;
      }
    }
    const newArmorClass = armorClassFor(next, desMod);
    if (next.caOverride === null && newArmorClass !== oldArmorClass) {
      if (equippedArmorFixed) {
        note(report, `CA: a armadura equipada agora vale o do livro; a CA passa de ${oldArmorClass} para ${newArmorClass}`);
      } else {
        next.caExtra += oldArmorClass - newArmorClass;
        note(report, `CA: extra ajustado em ${oldArmorClass - newArmorClass >= 0 ? "+" : ""}${oldArmorClass - newArmorClass} para manter a CA ${oldArmorClass} da ficha antiga`);
      }
    }

    // O site antigo não aplicava o +2; quem o digitou no extra passa a tê-lo automático.
    const adjustedExtra = Math.max(0, next.initiativeExtra - INITIATIVE_BASE_BONUS);
    if (adjustedExtra !== next.initiativeExtra) {
      next.initiativeExtra = adjustedExtra;
      note(report, `iniciativa: o +${INITIATIVE_BASE_BONUS} de Reflexos de TDAH agora é automático e foi retirado do extra da ficha antiga`);
    }
  }

  // Perícias antigas guardavam o nível final. Agora o livro calcula (filiação + antecedente) e só a diferença fica como ajuste manual.
  if (legacy.skillRanks) {
    const merged = mergeSkillRanks(legacy.skillRanks);
    if (merged.changed) note(report, "perícias: chaves duplicadas por acento ou caixa foram unificadas");
    const automatic = deriveStats({ ...next, skillRankOverrides: {} }).skills;
    const overrides: Record<string, number> = {};
    for (const skill of automatic) {
      const stored = merged.ranks[skill.name] ?? 0;
      if (stored !== skill.autoRank) overrides[skill.name] = stored;
    }
    next.skillRankOverrides = overrides;
    const manual = Object.keys(overrides).length;
    if (manual) note(report, `perícias: ${manual} ${manual === 1 ? "nível mantido" : "níveis mantidos"} como ajuste manual (use "Perícias automáticas" para seguir só o livro)`);
  }

  // `hpMax`/`manaMax` escritos à mão (ficha antiga ou gerada por IA) que divergem do livro viram ajuste manual.
  // Valores iguais ao cálculo do livro, como os exportados por esta ficha, continuam automáticos.
  const derived = deriveStats(next);
  if (next.hpMaxOverride === null && legacy.hpMax > 0 && legacy.hpMax !== derived.hpMax.auto) {
    next.hpMaxOverride = legacy.hpMax;
    if (derived.hpMax.auto !== null) note(report, `PV máximo: valor ${legacy.hpMax} mantido como ajuste manual (o livro calcula ${derived.hpMax.auto})`);
  }
  if (next.manaMaxOverride === null && legacy.manaMax > 0 && legacy.manaMax !== derived.manaMax.auto) {
    next.manaMaxOverride = legacy.manaMax;
    note(report, `MP máximo: valor ${legacy.manaMax} mantido como ajuste manual (o livro calcula ${derived.manaMax.auto})`);
  }

  // Deslocamento digitado que difere do livro (6 m + bônus do Dom) vira ajuste manual.
  if (next.speedOverride === null && legacy.speed > 0 && legacy.speed !== derived.speed.auto) {
    next.speedOverride = legacy.speed;
    note(report, `deslocamento: ${legacy.speed} m mantido como ajuste manual (o livro calcula ${derived.speed.auto} m)`);
  }

  next.version = SHEET_VERSION;
  return next;
}
