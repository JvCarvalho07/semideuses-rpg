import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SHEET_VERSION, migrateSheet, readLegacyValues } from "../src/migrate.ts";
import {
  ARMOR_CATALOG, BACKGROUNDS, FILIATION_RESOURCES, FILIATION_RULES, armorClassFor, autoMaxHp, autoMaxMana, autoSkillRanks,
  backgroundSkills, canonicalSkill, clampResource, deriveStats, inferArmor, mergeSkillRanks, modifier, originKind, proficiency, setEquipped,
} from "../src/rules.ts";

const fixture = async () => JSON.parse(await readFile(new URL("./fixtures/personagem-v3-ares-nivel8.json", import.meta.url), "utf8"));

const ATTRIBUTES = { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 };

/** Ficha já normalizada (o que `import.ts` entrega ao migrador), a partir de campos soltos. */
function sheetOf(raw) {
  const sheet = {
    version: 3, level: 1, filiation: "", origin: "", background: "", attributes: { ...ATTRIBUTES }, saveProficiencies: [],
    skillRankOverrides: {}, castingAttribute: "sab", castingDcOverride: null, hpMaxOverride: null, manaMaxOverride: null,
    resourceMaxOverride: null, domSkill: "", hp: 0, divineResource: 0, speedOverride: null, initiativeExtra: 0, initiativeOverride: null,
    caExtra: 0, caOverride: null, perceptionOverride: null, equipment: [], effects: [], ...raw,
  };
  sheet.equipment = sheet.equipment.map((item) => ({ armorCategory: "", name: "", properties: "", ...item }));
  return sheet;
}

function migrate(raw) {
  const report = { adjustments: [] };
  const sheet = migrateSheet(sheetOf(raw), readLegacyValues(raw), report);
  return { sheet, report, stats: deriveStats(sheet) };
}

test("modificadores e bônus de proficiência seguem as tabelas do livro", () => {
  assert.deepEqual([1, 8, 10, 11, 16, 20, 30].map(modifier), [-5, -1, 0, 0, 3, 5, 10]);
  assert.deepEqual([1, 4, 5, 8, 9, 13, 17, 20].map(proficiency), [2, 2, 3, 3, 4, 5, 6, 6]);
});

test("PV e MP máximos reproduzem os exemplos do livro", () => {
  // Atena (d8), CON +2: 10 PV no nível 1 e 38 no nível 5. Filho de Ares (d12), CON +2: 14 e 50.
  assert.equal(autoMaxHp("Atena", 1, 2), 10);
  assert.equal(autoMaxHp("Atena", 5, 2), 38);
  assert.equal(autoMaxHp("Ares", 1, 2), 14);
  assert.equal(autoMaxHp("Ares", 5, 2), 50);
  assert.equal(autoMaxHp("", 5, 2), null);
  // Tabela de MP com Conjuração +3: 9 no nível 1, 29 no 5 e 104 no 20.
  assert.equal(autoMaxMana(1, 3), 9);
  assert.equal(autoMaxMana(5, 3), 29);
  assert.equal(autoMaxMana(20, 3), 104);
});

test("as 26 filiações têm Dado de Vida, Conjuração, resistências, perícias e recurso", () => {
  const names = Object.keys(FILIATION_RULES);
  assert.equal(names.length, 26);
  assert.deepEqual(Object.keys(FILIATION_RESOURCES).sort(), [...names].sort());
  for (const name of names) {
    const rule = FILIATION_RULES[name];
    assert.ok([6, 8, 10, 12].includes(rule.hitDie), name);
    assert.notEqual(rule.saves[0], rule.saves[1], name);
    assert.equal(new Set(rule.skills).size, 3, name);
    for (const skill of rule.skills) assert.ok(canonicalSkill(skill), `${name}: ${skill}`);
  }
  assert.deepEqual(FILIATION_RULES.Ares.saves, ["for", "con"]);
  assert.equal(FILIATION_RULES.Hebe.usesMana, false);
});

test("o recurso de cada filiação segue a Assinatura do livro", () => {
  const stats = (filiation, extra = {}) => deriveStats(sheetOf({ filiation, castingAttribute: FILIATION_RULES[filiation].casting, ...extra }));
  // Zeus: teto 5 (não 6) e começa com 1 Carga.
  assert.deepEqual([stats("Zeus").resource.min, stats("Zeus").resource.max, stats("Zeus").resource.start], [0, 5, 1]);
  // Poseidon: Maré de −3 a +3, começando em 0.
  const sea = stats("Poseidon").resource;
  assert.deepEqual([sea.min, sea.max, sea.start], [-3, 3, 0]);
  assert.equal(clampResource(-9, sea), -3);
  assert.equal(clampResource(9, sea), 3);
  // Hades: 3 + Conjuração. Atena: 2 + Conjuração (início) e o dobro disso (teto).
  assert.equal(stats("Hades", { attributes: { ...ATTRIBUTES, car: 14 } }).resource.max, 5);
  const atena = stats("Atena", { attributes: { ...ATTRIBUTES, int: 16 } }).resource;
  assert.deepEqual([atena.start, atena.max], [5, 10]);
  // Hefesto: 1 + metade do nível. Hermes: proficiência + Conjuração. Hebe: 2 × nível. Nêmesis: teto 5.
  assert.equal(stats("Hefesto", { level: 8 }).resource.max, 5);
  assert.equal(stats("Hermes", { level: 5, attributes: { ...ATTRIBUTES, car: 14 } }).resource.max, 3 + 2);
  assert.equal(stats("Hebe", { level: 6 }).resource.max, 12);
  assert.equal(stats("Nêmesis").resource.max, 5);
  // Deméter: 3 zonas, 5 a partir do nível 11.
  assert.equal(stats("Deméter", { level: 10 }).resource.max, 3);
  assert.equal(stats("Deméter", { level: 11 }).resource.max, 5);
  // Filiações sem contador próprio.
  for (const name of ["Apolo", "Dionísio", "Ártemis", "Íris", "Hipnos", "Tânatos", "Éolo", "Perséfone", "Nyx"]) assert.equal(stats(name).resource, null, name);
  // Ares: Fúria 0–10 e começa igual aos PV já perdidos.
  const ares = stats("Ares", { level: 3, attributes: { ...ATTRIBUTES, con: 14 }, hp: 20 }).resource;
  assert.equal(ares.max, 10);
  assert.equal(ares.start, 10); // 12+2 + 2×(7+2) = 32 PV; 12 perdidos, limitado ao teto
  assert.equal(stats("Ares", { level: 1, hp: 8 }).resource.start, 4);
  // O livro não fixa teto para Encanto: o valor pode passar do máximo calculado.
  const charm = stats("Afrodite", { attributes: { ...ATTRIBUTES, car: 14 } }).resource;
  assert.equal(clampResource(5, charm), 5);
});

test("Hebe e as origens sem Mana não têm MP", () => {
  assert.equal(deriveStats(sheetOf({ filiation: "Hebe", castingAttribute: "con" })).manaMax.value, 0);
  assert.equal(deriveStats(sheetOf({ origin: "Ciclope", castingAttribute: "for" })).manaMax.value, 0);
  assert.equal(deriveStats(sheetOf({ origin: "Mortal Vidente" })).manaMax.value, 0);
  assert.equal(deriveStats(sheetOf({ origin: "Sátiro", castingAttribute: "sab", attributes: { ...ATTRIBUTES, sab: 14 } })).manaMax.value, 8);
});

test("origens sem filiação seguem Heróis Além do Sangue", () => {
  assert.deepEqual(["Semideus Grego", "Sátiro / Fauno", "Ciclope", "Mortal Vidente", "Legado romano"].map(originKind), ["greek", "satyr", "cyclops", "mortal", "legacy"]);
  // Ciclope: d12, Força e Constituição, pele +2 de CA sem armadura.
  const cyclops = deriveStats(sheetOf({ origin: "Ciclope", level: 1, attributes: { ...ATTRIBUTES, con: 14, des: 12 } }));
  assert.equal(cyclops.hpMax.value, 14);
  assert.equal(cyclops.armorClass.value, 10 + 1 + 2);
  assert.deepEqual(cyclops.profile.saves, ["for", "con"]);
  // Mortal Vidente: Pontos de Sorte = proficiência, sem filiação.
  const mortal = deriveStats(sheetOf({ origin: "Mortal Vidente", level: 5 }));
  assert.deepEqual([mortal.resource.spec.name, mortal.resource.max, mortal.resource.start], ["Pontos de Sorte", 3, 3]);
  assert.deepEqual(mortal.profile.saves, ["int", "car"]);
  // Sátiro: d8 e resistências DES/SAB.
  assert.deepEqual(deriveStats(sheetOf({ origin: "Sátiro" })).profile.saves, ["des", "sab"]);
});

test("Legado: DV um passo menor, MP reduzido e reservas pela metade", () => {
  const base = { filiation: "Ares", origin: "Legado", castingAttribute: "for", level: 5, attributes: { ...ATTRIBUTES, for: 16, con: 14 } };
  const legacy = deriveStats(sheetOf(base));
  assert.equal(legacy.profile.hitDie, 10); // d12 → d10
  assert.equal(legacy.hpMax.value, 10 + 2 + 4 * (6 + 2));
  assert.equal(legacy.manaMax.value, (4 + 3) + 4 * (1 + 3)); // 4 + Conj. e 1 + Conj. por nível
  assert.equal(legacy.resource.max, 5); // Fúria 10 → 5
  assert.deepEqual(legacy.profile.saves, ["for", "con"]);
  const full = deriveStats(sheetOf({ ...base, origin: "Semideus Grego" }));
  assert.equal(full.resource.max, 10);
  assert.ok(legacy.manaMax.value < full.manaMax.value);
});

test("CA respeita a categoria da armadura", () => {
  const armor = (armorCategory, armorClass) => ({ type: "Armadura", equipped: true, armorClass, armorCategory });
  assert.equal(armorClassFor({ equipment: [], caExtra: 0 }, 3), 13);
  assert.equal(armorClassFor({ equipment: [armor("Leve", 12)], caExtra: 0 }, 4), 16);
  assert.equal(armorClassFor({ equipment: [armor("Média", 15)], caExtra: 0 }, 4), 17);
  assert.equal(armorClassFor({ equipment: [armor("Média", 15)], caExtra: 0 }, 1), 16);
  assert.equal(armorClassFor({ equipment: [armor("Pesada", 18)], caExtra: 0 }, 4), 18);
  assert.equal(armorClassFor({ equipment: [armor("", 14)], caExtra: 0 }, 4), 14);
  const shield = { type: "Escudo", equipped: true, armorClass: 2, armorCategory: "" };
  assert.equal(armorClassFor({ equipment: [armor("Média", 15), shield], caExtra: 1 }, 1), 19);
  assert.ok(ARMOR_CATALOG.every((entry) => entry.type === "Escudo" || entry.category));
  assert.deepEqual(inferArmor("Armadura média. CA base 15 + modificador de DES, máximo +2."), { category: "Média", base: 15 });
});

test("deslocamento: 6 m, +3 m no Dom de Hermes e Éolo e nos Pés de Bode do Sátiro", () => {
  assert.equal(deriveStats(sheetOf({})).speed.value, 6);
  assert.equal(deriveStats(sheetOf({ filiation: "Hermes" })).speed.value, 9);
  assert.equal(deriveStats(sheetOf({ filiation: "Éolo" })).speed.value, 9);
  assert.equal(deriveStats(sheetOf({ origin: "Sátiro" })).speed.value, 9);
  assert.equal(deriveStats(sheetOf({ filiation: "Hermes", origin: "Legado" })).speed.value, 9);
  assert.equal(deriveStats(sheetOf({ filiation: "Ares", speedOverride: 12 })).speed.value, 12);
  // Ficha antiga com 6 m digitado já bate com o livro; com outro valor vira ajuste manual.
  assert.equal(migrate({ version: 3, filiation: "Ares", speed: 6 }).sheet.speedOverride, null);
  assert.equal(migrate({ version: 3, filiation: "Ares", speed: 9 }).sheet.speedOverride, 9);
  assert.equal(migrate({ version: 3, filiation: "Hermes", speed: 9 }).sheet.speedOverride, null);
});

test("Dons que dão Especialização em uma perícia à escolha", () => {
  const rank = (raw, skill) => deriveStats(sheetOf(raw)).skills.find((entry) => entry.name === skill);
  assert.equal(rank({ filiation: "Hermes" }, "Acrobacia").rank, 0); // ainda sem escolha
  assert.equal(rank({ filiation: "Hermes", domSkill: "Acrobacia" }, "Acrobacia").rank, 2);
  assert.equal(rank({ filiation: "Hermes", domSkill: "Atletismo" }, "Atletismo").rank, 0); // fora das opções do Dom
  assert.equal(rank({ filiation: "Circe", domSkill: "Medicina" }, "Medicina").rank, 2);
  assert.equal(rank({ filiation: "Atena", domSkill: "Percepção" }, "Percepção").rank, 2);
  assert.equal(rank({ origin: "Sátiro", domSkill: "Atletismo" }, "Atletismo").rank, 2);
  assert.deepEqual(deriveStats(sheetOf({ filiation: "Ares" })).domSkillOptions, []);
});

test("armadura pesada só para Ares, Hefesto e Ciclope", () => {
  const heavy = [{ type: "Armadura", equipped: true, armorClass: 18, armorCategory: "Pesada" }];
  for (const raw of [{ filiation: "Ares" }, { filiation: "Hefesto" }, { origin: "Ciclope" }]) assert.equal(deriveStats(sheetOf({ ...raw, equipment: heavy })).armorWarnings.length, 0);
  for (const filiation of ["Zeus", "Atena", "Nike"]) assert.equal(deriveStats(sheetOf({ filiation, equipment: heavy })).armorWarnings.length, 1);
});

test("armadura ou escudo sem proficiência gera aviso", () => {
  const equipment = [
    { type: "Armadura", equipped: true, armorClass: 18, armorCategory: "Pesada" },
    { type: "Escudo", equipped: true, armorClass: 2, armorCategory: "" },
  ];
  assert.equal(deriveStats(sheetOf({ filiation: "Ares", equipment })).armorWarnings.length, 0);
  assert.equal(deriveStats(sheetOf({ filiation: "Apolo", equipment })).armorWarnings.length, 2);
  assert.equal(deriveStats(sheetOf({ filiation: "Hades", equipment })).armorWarnings.length, 2);
});

test("antecedentes concedem 3 perícias e a repetida vira Especialização", () => {
  assert.equal(BACKGROUNDS.length, 10);
  for (const entry of BACKGROUNDS) for (const skill of entry.skills) assert.ok(canonicalSkill(skill), `${entry.name}: ${skill}`);
  assert.deepEqual(backgroundSkills("sobrevivente"), ["Medicina", "Sobrevivência", "Intuição"]);
  assert.deepEqual(backgroundSkills("Filho de Família"), ["Persuasão", "História", "Intuição"]);
  assert.deepEqual(backgroundSkills("Cozinheiro"), []);
  const ranks = autoSkillRanks(FILIATION_RULES.Ares.skills, "Sobrevivente");
  assert.equal(ranks["Sobrevivência"], 2);
  assert.equal(ranks["Atletismo"], 1);
  assert.equal(ranks["Medicina"], 1);
  assert.equal(ranks["Percepção"], undefined);
});

test("perícias duplicadas por acento são unificadas mantendo o maior nível", () => {
  assert.equal(canonicalSkill("sobrevivencia"), "Sobrevivência");
  assert.equal(canonicalSkill("religiao"), "Religião");
  assert.equal(canonicalSkill("lidarcomanimais"), "Lidar com Animais");
  const merged = mergeSkillRanks({ sobrevivencia: 1, Sobrevivência: 2, saberMitico: 1 });
  assert.deepEqual(merged.ranks, { Sobrevivência: 2, "Saber Mítico": 1 });
  assert.equal(merged.changed, true);
  assert.equal(mergeSkillRanks({ Atletismo: 1 }).changed, false);
});

test("a ficha v3 do Héctor mantém os números do PDF depois da migração", async () => {
  const raw = await fixture();
  const { sheet, report, stats } = migrate(raw);
  assert.equal(sheet.version, SHEET_VERSION);
  assert.equal(stats.armorClass.value, 18);
  // A CA saiu arrumada: armadura equipada, escudo com o +2 lido do texto e nenhum extra escondido.
  assert.equal(sheet.caExtra, 0);
  assert.equal(sheet.equipment[0].equipped, true);
  assert.equal(sheet.equipment[1].armorClass, 2);
  assert.ok(report.adjustments.some((message) => message.includes("equipada")));
  assert.equal(stats.initiative.value, 3);
  assert.equal(stats.perception.value, 14);
  assert.equal(stats.castingAttackBonus, 8);
  assert.equal(stats.castingDc.value, 16);
  assert.equal(stats.saves.for.bonus, 8);
  assert.equal(stats.saves.con.bonus, 6);
  assert.equal(stats.saves.des.bonus, 1);
  assert.equal(stats.skills.find((skill) => skill.name === "Sobrevivência").bonus, 7);
  assert.equal(stats.skills.find((skill) => skill.name === "Atletismo").bonus, 8);
  assert.equal(stats.hpMax.value, 88);
  assert.equal(stats.manaMax.value, 52);
  assert.equal(stats.hpMax.auto, 85);
  assert.equal(stats.manaMax.auto, 60);
  assert.equal(sheet.hpMaxOverride, 88);
  assert.equal(sheet.manaMaxOverride, 52);
  assert.equal(sheet.initiativeExtra, 0);
  assert.ok(report.adjustments.some((message) => message.includes("PV máximo")));
  // Perícias: o livro já dá tudo menos Percepção, que fica como ajuste manual.
  assert.deepEqual(sheet.skillRankOverrides, { Percepção: 1 });
  assert.equal(stats.skills.find((skill) => skill.name === "Sobrevivência").autoRank, 2);
});

test("migrar duas vezes não altera de novo uma ficha já na versão atual", async () => {
  const raw = await fixture();
  const once = migrate(raw).sheet;
  const twice = migrateSheet(once, readLegacyValues({ version: SHEET_VERSION, skillRankOverrides: once.skillRankOverrides, hpMaxOverride: 88, manaMaxOverride: 52 }), { adjustments: [] });
  assert.deepEqual(twice, once);
});

test("ficha sem PV/MP salvos usa o cálculo do livro", () => {
  const { sheet, stats } = migrate({
    version: 3, level: 5, filiation: "Atena", castingAttribute: "int", attributes: { ...ATTRIBUTES, con: 14, int: 16 },
  });
  assert.equal(sheet.hpMaxOverride, null);
  assert.equal(stats.hpMax.value, 38);
  assert.equal(stats.manaMax.value, 29);
  // O site antigo não aplicava o +2: extra 0 continua 0 e a iniciativa passa a ser DES + 2.
  assert.equal(sheet.initiativeExtra, 0);
  assert.equal(stats.initiative.value, 2);
});

test("PV/MP exportados continuam automáticos quando a ficha sobe de nível fora do site", () => {
  const exported = { version: 4, hpMax: 38, manaMax: 29, hpMaxOverride: null, manaMaxOverride: null, skillRankOverrides: {} };
  assert.deepEqual(readLegacyValues(exported), { version: 4, hpMax: 0, manaMax: 0, speed: 0, skillRanks: null });
  assert.deepEqual(readLegacyValues({ version: 3, hpMax: 88, manaMax: 52, speed: 6 }), { version: 3, hpMax: 88, manaMax: 52, speed: 6, skillRanks: {} });
  assert.equal(readLegacyValues({ hpMax: "x" }).hpMax, 0);
  const { sheet, stats } = migrate({ ...exported, level: 6, filiation: "Atena", castingAttribute: "int", attributes: { ...ATTRIBUTES, con: 14, int: 16 } });
  assert.equal(sheet.hpMaxOverride, null);
  assert.equal(stats.hpMax.value, 45);
});

test("espada cadastrada como escudo sem bônus vira arma", () => {
  const { sheet } = migrate({ version: 3, equipment: [{ name: "Espada do Fio de Cerco", type: "Escudo", equipped: true, armorClass: 0, properties: "Espada longa especial." }] });
  assert.equal(sheet.equipment[0].type, "Arma");
});

test("armadura equipada com valor 0 passa a valer o do livro", () => {
  const { sheet, stats } = migrate({
    version: 3, level: 8, filiation: "Ares", castingAttribute: "for", attributes: { ...ATTRIBUTES, des: 13 },
    equipment: [{ name: "Armadura Hoplita", type: "Armadura", equipped: true, armorClass: 0, properties: "Armadura média. CA base 15 + modificador de DES, máximo +2." }],
  });
  assert.equal(sheet.equipment[0].armorCategory, "Média");
  // Antes a armadura valia 0 e a CA caía para 11 (10 + DES). Agora vale 15 + DES (máx. +2) = 16.
  assert.equal(stats.armorClass.value, 16);
  assert.equal(sheet.caExtra, 0);
});

test("bênçãos e maldições ativas entram nas contas; as desligadas não", () => {
  const base = { filiation: "Ares", level: 5, castingAttribute: "for", attributes: { ...ATTRIBUTES, des: 14, con: 14 } };
  const plain = deriveStats(sheetOf(base));
  const effect = (over) => ({ active: true, ca: 0, initiative: 0, speed: 0, hpMax: 0, ...over });
  const blessed = deriveStats(sheetOf({ ...base, effects: [effect({ ca: 2, initiative: 1, speed: 3, hpMax: 10 }), effect({ active: false, ca: 9 })] }));
  assert.equal(blessed.armorClass.value, plain.armorClass.value + 2);
  assert.equal(blessed.initiative.value, plain.initiative.value + 1);
  assert.equal(blessed.speed.value, plain.speed.value + 3);
  assert.equal(blessed.hpMax.value, plain.hpMax.value + 10);
  assert.equal(blessed.hpMax.auto, plain.hpMax.auto); // o cálculo do livro não muda
  assert.deepEqual(blessed.effects, { ca: 2, initiative: 1, speed: 3, hpMax: 10 });
  const cursed = deriveStats(sheetOf({ ...base, effects: [effect({ ca: -3 })] }));
  assert.equal(cursed.armorClass.value, plain.armorClass.value - 3);
});

test("equipar uma armadura ou escudo guarda a anterior", () => {
  const items = [
    { id: "a1", type: "Armadura", equipped: true }, { id: "a2", type: "Armadura", equipped: false },
    { id: "s1", type: "Escudo", equipped: true }, { id: "w1", type: "Arma", equipped: true }, { id: "w2", type: "Arma", equipped: false },
  ];
  const swapped = setEquipped(items, "a2", true);
  assert.deepEqual(swapped.map((item) => item.equipped), [false, true, true, true, false]);
  assert.deepEqual(setEquipped(items, "w2", true).map((item) => item.equipped), [true, false, true, true, true]); // armas: várias
  assert.deepEqual(setEquipped(items, "a1", false).map((item) => item.equipped), [false, false, true, true, false]);
  assert.equal(setEquipped(items, "nada", true), items);
});

test("o catálogo do livro monta armas, armaduras e escudos prontos para a ficha", async () => {
  const { CATALOG_GROUPS, equipmentFromCatalog } = await import("../src/catalogItems.ts");
  const { WEAPON_CATALOG } = await import("../src/weaponCatalog.ts");
  assert.equal(WEAPON_CATALOG.length, 45);
  assert.deepEqual(CATALOG_GROUPS.map((group) => group.label), ["Armas simples", "Armas marciais", "Armaduras", "Escudos"]);
  const longsword = equipmentFromCatalog("Espada Longa", "x1");
  assert.deepEqual([longsword.type, longsword.damage, longsword.equipped, longsword.quantity], ["Arma", "1d8 Cortante", false, 1]);
  assert.match(longsword.properties, /Versátil \(1d10\)/);
  assert.match(equipmentFromCatalog("Harpe", "x2").notes, /ignora Resistência a Cortante/);
  const hoplite = equipmentFromCatalog("Armadura Hoplita", "x3");
  assert.deepEqual([hoplite.type, hoplite.armorClass, hoplite.armorCategory], ["Armadura", 15, "Média"]);
  const shield = equipmentFromCatalog("Escudo de Bronze", "x4");
  assert.deepEqual([shield.type, shield.armorClass], ["Escudo", 2]);
  assert.equal(equipmentFromCatalog("Item que não existe", "x5"), undefined);
  for (const group of CATALOG_GROUPS) for (const name of group.entries) assert.ok(equipmentFromCatalog(name, "t"), name);
});
