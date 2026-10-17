import assert from "node:assert/strict";
import test from "node:test";
import { findPath, pathNames, syncAbilities } from "../src/abilitySync.ts";
import { BACKGROUND_TRAITS, FILIATION_ABILITIES, ORIGIN_ABILITIES, PATH_ABILITIES } from "../src/officialAbilities.ts";
import { BACKGROUNDS, FILIATION_RULES } from "../src/rules.ts";

const empty = () => ({ abilities: [], filiation: [], path: [], skills: [], talents: [] });
const sheetOf = (raw = {}) => ({ level: 1, filiation: "", origin: "", background: "", pathName: "", abilityGroups: empty(), ...raw });
const names = (list) => list.map((item) => item.name);
const apply = (raw, options) => {
  const result = syncAbilities(sheetOf(raw), options);
  return { ...result, groups: result.abilityGroups };
};

test("o livro tem Dom, 7 habilidades base e Caminhos de 4 habilidades para as 26 filiações", () => {
  for (const name of Object.keys(FILIATION_RULES)) {
    const base = FILIATION_ABILITIES[name];
    assert.deepEqual(base.map((item) => item.level), [1, 1, 2, 5, 5, 10, 15, 20].sort((a, b) => a - b), name);
    assert.equal(base[0].name, `Dom de ${name}`);
    const paths = Object.entries(PATH_ABILITIES[name]);
    assert.ok(paths.length >= 2, `${name} tem Caminhos`);
    for (const [path, items] of paths) assert.deepEqual(items.map((item) => item.level), [3, 7, 12, 17], `${name} / ${path}`);
    for (const item of [...base, ...paths.flatMap(([, items]) => items)]) {
      assert.ok(item.description.length > 20, `${item.id} sem texto`);
      assert.doesNotMatch(item.description, /Mecânica\.|A s F i l i a/, item.id);
    }
  }
  assert.equal(Object.keys(ORIGIN_ABILITIES).length, 4);
  for (const entry of BACKGROUNDS) assert.ok(BACKGROUND_TRAITS[entry.name], entry.name);
});

test("escolher a filiação carrega o Dom e as habilidades do nível", () => {
  assert.deepEqual(names(apply({ filiation: "Ares", level: 1 }).groups.filiation), ["Dom de Ares", "Talho Brutal"]);
  const lvl5 = apply({ filiation: "Ares", level: 5 }).groups.filiation;
  assert.deepEqual(names(lvl5), ["Dom de Ares", "Talho Brutal", "Cheiro de Sangue", "Investida Sangrenta", "Marca do Herói"]);
  assert.equal(lvl5[0].extra.official, true);
});

test("subir de nível acrescenta só o que é novo e respeita habilidades apagadas", () => {
  const first = apply({ filiation: "Ares", level: 1 });
  const withoutTalho = { ...first.groups, filiation: first.groups.filiation.filter((item) => item.name !== "Talho Brutal") };
  const up = syncAbilities(sheetOf({ filiation: "Ares", level: 5, abilityGroups: withoutTalho }), { fromLevel: 1 });
  assert.deepEqual(up.added, ["Cheiro de Sangue", "Investida Sangrenta", "Marca do Herói"]);
  assert.ok(!names(up.abilityGroups.filiation).includes("Talho Brutal"));
});

test("Caminho: carrega, troca e reconhece o nome curto", () => {
  assert.ok(pathNames("Ares").includes("Caminho do Veterano"));
  assert.equal(findPath("Ares", "veterano"), "Caminho do Veterano");
  assert.equal(findPath("Ares", "Caminho do Tirano"), "Caminho do Tirano");
  assert.equal(findPath("Ares", "Caminho Inventado"), undefined);
  const vet = apply({ filiation: "Ares", level: 8, pathName: "Caminho do Veterano" });
  assert.deepEqual(names(vet.groups.path), ["Aguentar", "Provocar"]);
  const swapped = syncAbilities(sheetOf({ filiation: "Ares", level: 8, pathName: "Tirano", abilityGroups: vet.groups }));
  assert.deepEqual(names(swapped.abilityGroups.path), ["Brado", "Presença Aterradora"]);
  assert.deepEqual(swapped.removed, ["Aguentar", "Provocar"]);
});

test("trocar de filiação retira as oficiais intactas e preserva as editadas e as do jogador", () => {
  const ares = apply({ filiation: "Ares", level: 5, pathName: "Veterano" });
  const groups = { ...ares.groups, filiation: ares.groups.filiation.map((item) => (item.name === "Talho Brutal" ? { ...item, description: "Versão da mesa." } : item)) };
  groups.talents = [{ id: "t1", name: "Meu talento", level: 1, rank: "", cost: "", activation: "", range: "", duration: "", recharge: "", description: "x", extra: {} }];
  const zeus = syncAbilities(sheetOf({ filiation: "Zeus", level: 5, abilityGroups: groups }));
  assert.ok(!names(zeus.abilityGroups.filiation).includes("Dom de Ares"));
  assert.ok(names(zeus.abilityGroups.filiation).includes("Talho Brutal"), "editada fica");
  assert.ok(names(zeus.abilityGroups.filiation).includes("Dom de Zeus"));
  assert.equal(zeus.abilityGroups.talents.length, 1);
});

test("não duplica o que a ficha já tem, por id ou por nome", () => {
  const existing = [
    { id: "ares-dom", name: "Dom de Ares", level: 1, rank: "", cost: "", activation: "Passiva", range: "", duration: "", recharge: "", description: "texto da mesa", extra: { sourceId: "ares-dom" } },
    { id: "x", name: "Talho  Brutal", level: 1, rank: "E", cost: "1 MP", activation: "", range: "", duration: "", recharge: "", description: "meu texto", extra: {} },
  ];
  const result = syncAbilities(sheetOf({ filiation: "Ares", level: 1, abilityGroups: { ...empty(), filiation: existing } }));
  assert.equal(result.added.length, 0);
  assert.equal(result.abilityGroups.filiation.length, 2);
});

test("a Marca do Herói que o jogador já cadastrou com sufixo não é duplicada", () => {
  const mine = { id: "m", name: "Marca do Herói — Ataque Extra", level: 5, rank: "", cost: "", activation: "Passiva", range: "", duration: "", recharge: "", description: "x", extra: {} };
  const result = syncAbilities(sheetOf({ filiation: "Ares", level: 5, abilityGroups: { ...empty(), filiation: [mine] } }));
  assert.equal(result.abilityGroups.filiation.filter((item) => item.name.startsWith("Marca do Herói")).length, 1);
});

test("subir de nível em duas etapas não traz de volta o que o jogador apagou", () => {
  const first = apply({ filiation: "Ares", level: 5 }).groups;
  const trimmed = { ...first, filiation: first.filiation.filter((item) => item.name !== "Investida Sangrenta") };
  const again = syncAbilities(sheetOf({ filiation: "Ares", level: 5, abilityGroups: trimmed }), { fromLevel: 5 });
  assert.ok(!names(again.abilityGroups.filiation).includes("Investida Sangrenta"));
  assert.equal(again.added.length, 0);
});

test("origens sem filiação e o traço do antecedente", () => {
  assert.ok(names(apply({ origin: "Ciclope", level: 3 }).groups.abilities).includes("Couro Grosso"));
  assert.ok(names(apply({ origin: "Sátiro", level: 1 }).groups.abilities).includes("Pés de Bode"));
  assert.ok(names(apply({ origin: "Mortal Vidente", level: 1 }).groups.abilities).includes("Sorte do Mortal"));
  assert.deepEqual(names(apply({ origin: "Ciclope", level: 3 }).groups.filiation), []);
  const trait = apply({ filiation: "Ares", background: "Sobrevivente", level: 1 }).groups.abilities;
  assert.deepEqual(names(trait), ["Vontade Inabalável"]);
});

test("Legado: Dom e base de nível 1, Caminho nos níveis 5, 9, 14 e 19", () => {
  const level1 = apply({ filiation: "Ares", origin: "Legado", level: 1, pathName: "Veterano" });
  assert.deepEqual(names(level1.groups.filiation), ["Dom de Ares", "Talho Brutal"]);
  assert.deepEqual(names(level1.groups.path), []);
  const level9 = apply({ filiation: "Ares", origin: "Legado", level: 9, pathName: "Veterano" });
  assert.deepEqual(level9.groups.path.map((item) => [item.name, item.level]), [["Aguentar", 5], ["Provocar", 9]]);
  assert.ok(names(level9.groups.abilities).includes("Sangue Diluído"));
  assert.ok(!names(level9.groups.filiation).includes("Cheiro de Sangue"));
});

test("as descrições das habilidades são curtas e sem restos do livro", () => {
  const all = [
    ...Object.values(FILIATION_ABILITIES).flat(),
    ...Object.values(PATH_ABILITIES).flatMap((byPath) => Object.values(byPath).flat()),
    ...Object.values(ORIGIN_ABILITIES).flat(),
    ...Object.values(BACKGROUND_TRAITS),
  ];
  assert.equal(all.length, 531);
  for (const item of all) {
    assert.ok(item.description.length <= 700, `${item.id} tem ${item.description.length} caracteres`);
    assert.doesNotMatch(item.description, /Criaturas invocadas|Capítulo \d|Mecânica|Ver Marca/, item.id);
  }
  assert.ok(ORIGIN_ABILITIES.mortal.some((item) => item.name === "Ofício de Mortal" && item.level === 2));
});
