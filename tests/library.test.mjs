import test from "node:test";
import assert from "node:assert/strict";
import { LEGACY_SHEET_KEY, LIBRARY_KEY, findByName, loadLibrary, readSheet, removeSheet, sheetKey, sortedEntries, writeSheet } from "../src/library.ts";

function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    data,
  };
}

const sheet = (name, extra = {}) => ({ name, filiation: "Ares", level: 3, avatarDataUrl: "", ...extra });

test("a ficha única antiga vira a primeira ficha da lista", () => {
  const store = memoryStore({ [LEGACY_SHEET_KEY]: JSON.stringify(sheet("Héctor Vance", { level: 8 })) });
  const { library, migratedLegacy } = loadLibrary(store);
  assert.equal(migratedLegacy, true);
  assert.equal(library.entries.length, 1);
  assert.equal(library.entries[0].name, "Héctor Vance");
  assert.equal(library.entries[0].level, 8);
  assert.equal(library.activeId, library.entries[0].id);
  assert.equal(readSheet(store, library.activeId).name, "Héctor Vance");
  // a segunda leitura usa o índice e não cria outra cópia
  assert.equal(loadLibrary(store).library.entries.length, 1);
});

test("navegador sem nada salvo começa com a lista vazia", () => {
  const { library } = loadLibrary(memoryStore());
  assert.deepEqual(library, { activeId: "", entries: [] });
});

test("salvar, trocar e apagar mantêm índice e fichas coerentes", () => {
  const store = memoryStore();
  let library = { activeId: "a", entries: [] };
  library = writeSheet(store, library, "a", sheet("Héctor Vance"), 1);
  library = writeSheet(store, library, "b", sheet("Evan Lessa", { filiation: "Zeus" }), 2);
  assert.equal(library.activeId, "b");
  assert.deepEqual(sortedEntries(library).map((entry) => entry.name), ["Evan Lessa", "Héctor Vance"]);

  // editar a ficha "a" atualiza o resumo sem duplicar
  library = writeSheet(store, library, "a", sheet("Héctor Vance", { level: 10 }), 3);
  assert.equal(library.entries.length, 2);
  assert.equal(library.entries.find((entry) => entry.id === "a").level, 10);

  // apagar a ficha aberta passa para outra
  library = removeSheet(store, library, "a");
  assert.equal(store.getItem(sheetKey("a")), null);
  assert.equal(library.activeId, "b");
  assert.equal(JSON.parse(store.getItem(LIBRARY_KEY)).entries.length, 1);
});

test("índice ignora fichas que sumiram do armazenamento", () => {
  const store = memoryStore();
  let library = writeSheet(store, { activeId: "", entries: [] }, "a", sheet("Héctor Vance"));
  library = writeSheet(store, library, "b", sheet("Evan Lessa"));
  store.removeItem(sheetKey("b"));
  const loaded = loadLibrary(store).library;
  assert.deepEqual(loaded.entries.map((entry) => entry.id), ["a"]);
  assert.equal(loaded.activeId, "a");
});

test("procura ficha pelo nome sem diferenciar acento e caixa", () => {
  const library = { activeId: "a", entries: [{ id: "a", name: "Héctor Vance", filiation: "", level: 1, avatarDataUrl: "", updatedAt: 0 }] };
  assert.equal(findByName(library, "hector vance")?.id, "a");
  assert.equal(findByName(library, "Evan"), undefined);
  assert.equal(findByName(library, ""), undefined);
});
