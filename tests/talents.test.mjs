import test from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_TALENTS, officialTalentFor, talentChoice } from "../src/officialTalents.ts";
import { deriveStats, talentEffects } from "../src/rules.ts";

const base = {
  level: 10, filiation: "Ares", origin: "Semideus Grego", background: "Sobrevivente",
  attributes: { for: 20, des: 13, con: 16, int: 10, sab: 12, car: 8 },
  saveProficiencies: ["for", "con"], domSkill: "", skillRankOverrides: {},
  castingAttribute: "for", castingDcOverride: null, hpMaxOverride: null, manaMaxOverride: null, resourceMaxOverride: null,
  hp: 10, divineResource: 0, speedOverride: null, initiativeExtra: 0, initiativeOverride: null,
  caExtra: 0, caOverride: null, perceptionOverride: null, equipment: [], effects: [],
};
const talent = (name, extra) => ({ name, extra });
const withTalents = (talents, extra = {}) => ({ ...base, ...extra, abilityGroups: { talents } });

test("catálogo do Cap. 10: nomes únicos e os quatro grupos", () => {
  const names = OFFICIAL_TALENTS.map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(OFFICIAL_TALENTS.length >= 70);
  for (const group of ["Combate", "Perícia", "Resistência", "Divino"]) assert.ok(OFFICIAL_TALENTS.some((entry) => entry.group === group), group);
  for (const entry of OFFICIAL_TALENTS) assert.ok(entry.summary && entry.effects.length, entry.name);
});

test("acha o talento pelo id aninhado da importação ou pelo nome sem acento", () => {
  assert.equal(officialTalentFor(talent("x", { extra: { extra: { sourceId: "talento-dureza-de-tita" } } }))?.name, "Dureza de Titã");
  assert.equal(officialTalentFor(talent("resistencia marcial"))?.name, "Resistência Marcial");
  assert.equal(officialTalentFor(talent("Talento do Mestre")), undefined);
  assert.equal(talentChoice(talent("Especialista", { selectedOptions: { choice: "Medicina" } })), "Medicina");
});

test("talentos de perícia dão Especialização automática", () => {
  const before = deriveStats(withTalents([]));
  const after = deriveStats(withTalents([talent("Atleta"), talent("Especialista", { selectedOptions: { choice: "Percepção" } })]));
  const rank = (stats, name) => stats.skills.find((skill) => skill.name === name).rank;
  assert.equal(rank(before, "Atletismo"), 1);
  assert.equal(rank(after, "Atletismo"), 2);
  assert.equal(rank(after, "Percepção"), 2);
});

test("Pele de Bronze soma 2 PV por nível, também sobre PV rolado", () => {
  const auto = deriveStats(withTalents([]));
  assert.equal(deriveStats(withTalents([talent("Pele de Bronze")])).hpMax.value, auto.hpMax.value + 20);
  assert.equal(deriveStats(withTalents([talent("Pele de Bronze")], { hpMaxOverride: 108 })).hpMax.value, 128);
});

test("Reservas Divinas soma o nível ao MP máximo, uma vez só", () => {
  const auto = deriveStats(withTalents([])).manaMax.value;
  assert.equal(deriveStats(withTalents([talent("Reservas Divinas"), talent("Reservas Divinas")])).manaMax.value, auto + 10);
});

test("Armadura Natural e Especialista em Armadura mudam a CA", () => {
  const des = 1;
  assert.equal(deriveStats(withTalents([])).armorClass.value, 10 + des);
  assert.equal(deriveStats(withTalents([talent("Armadura Natural")])).armorClass.value, 12 + des);
  const hoplita = { equipment: [{ type: "Armadura", equipped: true, armorClass: 15, armorCategory: "Média" }] };
  assert.equal(deriveStats(withTalents([], hoplita)).armorClass.value, 16);
  assert.equal(deriveStats(withTalents([talent("Especialista em Armadura", { selectedOptions: { choice: "Média" } })], hoplita)).armorClass.value, 17);
  // categoria diferente da armadura vestida não dá bônus
  assert.equal(deriveStats(withTalents([talent("Especialista em Armadura", { selectedOptions: { choice: "Leve" } })], hoplita)).armorClass.value, 16);
});

test("Lutador Agressivo e Reflexos de Combate marcam Vantagem na Iniciativa", () => {
  assert.equal(talentEffects([talent("Lutador Agressivo")]).initiativeAdvantage, true);
  assert.equal(talentEffects([talent("Golpe Poderoso")]).initiativeAdvantage, false);
});
