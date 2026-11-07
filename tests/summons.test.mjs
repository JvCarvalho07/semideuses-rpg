import test from "node:test";
import assert from "node:assert/strict";
import { availablePresets, baseSummonStats, makeSummons, normalizeSummons, summonLimit, SUMMON_PRESETS } from "../src/summons.ts";

const preset = (id) => SUMMON_PRESETS.find((item) => item.sourceId === id);

test("perfil padrão do livro: PV 4 × metade do nível, CA 13, 9 m, ataque e dano pela Conjuração", () => {
  // Abbie: Hades nível 10, CAR +4, proficiência +4.
  assert.deepEqual(baseSummonStats(10, 4, 4), { hpMax: 20, ca: 13, speed: 9, attackBonus: 8, damage: "1d8 + 4", save: 4 });
  assert.equal(baseSummonStats(7, 2, 3).hpMax, 16);
  assert.equal(baseSummonStats(1, 0, 2).damage, "1d8");
  assert.equal(baseSummonStats(3, -1, 2).damage, "1d8 − 1");
});

test("só aparecem invocações das habilidades que a ficha já tem no nível dela", () => {
  const hades = [
    { name: "Erguer Morto", level: 5, extra: { sourceId: "hades-erguer-morto" } },
    { name: "Comando Fúnebre", level: 3, extra: { sourceId: "hades-morte-comando-funebre" } },
    { name: "Horda", level: 12, extra: { sourceId: "hades-morte-horda" } },
  ];
  assert.deepEqual(availablePresets(hades, 10).map((item) => item.ability), ["Erguer Morto", "Comando Fúnebre"]);
  assert.deepEqual(availablePresets(hades, 4).map((item) => item.ability), ["Comando Fúnebre"]);
  assert.deepEqual(availablePresets([{ name: "Talho Brutal", level: 1 }], 10), []);
});

test("ficha antiga sem sourceId é reconhecida pelo nome", () => {
  assert.deepEqual(availablePresets([{ name: "erguer morto", level: 5 }], 10).map((item) => item.sourceId), ["hades-erguer-morto"]);
});

test("limite: 2 pelo livro, Horda sobe para 5 a partir do nível 12", () => {
  const horda = [{ name: "Horda", level: 12, extra: { sourceId: "hades-morte-horda" } }];
  assert.equal(summonLimit([], 10), 2);
  assert.equal(summonLimit(horda, 11), 2);
  assert.equal(summonLimit(horda, 12), 5);
});

test("invocar cria a criatura com PV cheios e numera repetidas", () => {
  const [first] = makeSummons(preset("hades-erguer-morto"), 10, 4, 4);
  assert.equal(first.name, "Servo morto-vivo");
  assert.equal(first.hp, 20);
  assert.equal(first.damageType, "Necrótico");
  const [second] = makeSummons(preset("hades-erguer-morto"), 10, 4, 4, [first]);
  assert.equal(second.name, "Servo morto-vivo 2");
  assert.notEqual(second.id, first.id);
});

test("Matilha traz três; Corcel e Torreta usam os números da própria habilidade", () => {
  assert.equal(makeSummons(preset("artemis-irmandade-matilha"), 12, 3, 4).length, 3);
  const [horse] = makeSummons(preset("poseidon-cavalos-corcel-das-ondas"), 6, 2, 3);
  assert.deepEqual([horse.ca, horse.hpMax, horse.speed], [14, 30, 18]);
  const [turret] = makeSummons(preset("hefesto-torreta"), 5, 3, 3);
  assert.deepEqual([turret.speed, turret.damage], [0, "2d8"]);
});

test("JSON sem invocações ou quebrado não derruba a ficha", () => {
  assert.deepEqual(normalizeSummons(undefined), []);
  const [summon] = normalizeSummons([{ name: "Esqueleto", hp: 99, hpMax: 20, ca: "x" }, null]);
  assert.equal(summon.hp, 20);
  assert.equal(summon.ca, 13);
  assert.ok(summon.id);
});
