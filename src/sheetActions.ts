// Transições da ficha que dependem das regras do livro (fora dos componentes para ficarem fáceis de testar e reaproveitar).
import type { CharacterSheet } from "./model";
import { ensureFiliationSignatures } from "./filiationSignatures";
import { clampResource, deriveStats, backgroundName, originKind, profileDefaults } from "./rules";
import { findPath, syncAbilities } from "./abilitySync";

function withAbilities(sheet: CharacterSheet, options?: { fromLevel?: number }): CharacterSheet {
  return { ...sheet, abilityGroups: syncAbilities(sheet, options).abilityGroups };
}

/**
 * Troca de filiação e/ou origem: preenche atributo de Conjuração, testes de resistência e o recurso inicial
 * conforme o livro. Só age quando a filiação ou o tipo de origem muda — nunca a cada digitação.
 */
export function applyIdentity(current: CharacterSheet, changes: { filiation?: string; origin?: string }): CharacterSheet {
  const filiation = changes.filiation ?? current.filiation;
  const origin = changes.origin ?? current.origin;
  const filiationChanged = filiation !== current.filiation;
  const kindChanged = originKind(origin) !== originKind(current.origin);
  const next: CharacterSheet = { ...current, filiation, origin };
  if (!filiationChanged && !kindChanged) return next;

  const defaults = profileDefaults(filiation, origin);
  if (defaults) {
    if (defaults.casting) next.castingAttribute = defaults.casting;
    next.saveProficiencies = defaults.saves as CharacterSheet["saveProficiencies"];
  }
  if (filiationChanged && filiation) next.filiationSignatures = ensureFiliationSignatures(current.filiationSignatures, filiation);

  const before = deriveStats(current);
  const after = deriveStats(next);
  // Ficha em branco: ao escolher a filiação, o personagem já começa com PV e MP cheios.
  if (!before.profile && after.profile) {
    if (current.hp === 0 && current.hpMaxOverride === null) next.hp = after.hpMax.value;
    if (current.mana === 0 && current.manaMaxOverride === null) next.mana = after.manaMax.value;
  }
  next.divineResource = after.resource ? clampResource(after.resource.start, after.resource) : 0;
  next.resourceMaxOverride = null;
  return withAbilities(next);
}

/** Subir (ou descer) de nível: libera as habilidades novas e retira as oficiais que ainda não valem. */
export function applyLevel(current: CharacterSheet, level: number): CharacterSheet {
  // Campo apagado ou inválido enquanto o jogador digita: ignora, em vez de cair para o nível 1 e retirar habilidades.
  if (!Number.isFinite(level) || level < 1) return current;
  const next = { ...current, level: Math.floor(level) };
  return withAbilities(next, { fromLevel: Math.min(current.level, next.level) });
}

/** Caminho divino: ao escolher um Caminho do livro, carrega as habilidades dele (e retira as do anterior). */
export function applyPath(current: CharacterSheet, pathName: string): CharacterSheet {
  const next = { ...current, pathName };
  const changed = findPath(current.filiation, current.pathName) !== findPath(next.filiation, pathName);
  return changed ? withAbilities(next) : next;
}

/** Antecedente: acrescenta o traço dele quando o nome é reconhecido. */
export function applyBackground(current: CharacterSheet, background: string): CharacterSheet {
  const next = { ...current, background };
  return backgroundName(current.background) !== backgroundName(background) ? withAbilities(next) : next;
}

/** Alterna o nível de uma perícia (nenhum → proficiente → especialista) e guarda só o que difere do cálculo do livro. */
export function cycleSkill(current: CharacterSheet, name: string): CharacterSheet {
  const skill = deriveStats(current).skills.find((entry) => entry.name === name);
  if (!skill) return current;
  const next = (skill.rank + 1) % 3;
  const overrides = { ...current.skillRankOverrides };
  if (next === skill.autoRank) delete overrides[name];
  else overrides[name] = next;
  return { ...current, skillRankOverrides: overrides };
}
