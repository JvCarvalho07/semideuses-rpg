import test from "node:test";
import assert from "node:assert/strict";
import { formatJournalDate, matchesJournal, newJournalEntry, normalizeJournal, openTodos, toRoman, todayIso } from "../src/journal.ts";

test("números de sessão em romano", () => {
  assert.deepEqual([1, 4, 8, 9, 14, 40, 99].map(toRoman), ["I", "IV", "VIII", "IX", "XIV", "XL", "XCIX"]);
  assert.equal(toRoman(0), "I");
});

test("data por extenso, com e sem ano", () => {
  assert.equal(formatJournalDate("2026-10-31"), "31 de outubro de 2026");
  assert.equal(formatJournalDate("2026-03-05", false), "5 de março");
  assert.equal(formatJournalDate(""), "sem data");
  assert.equal(todayIso(new Date(2026, 0, 2)), "2026-01-02");
});

test("ficha sem diário ou com lixo no JSON vira lista vazia", () => {
  assert.deepEqual(normalizeJournal(undefined), []);
  assert.deepEqual(normalizeJournal("texto"), []);
  assert.deepEqual(normalizeJournal([null, 3, "x"]), []);
});

test("diário importado mantém o texto e corrige campos quebrados", () => {
  const [entry] = normalizeJournal([{ id: "s1", title: "Emboscada", date: "31/10", body: "Doze soldados", todos: [{ text: "Perguntar ao mestre", done: true }, { text: "Fúria" }] }]);
  assert.equal(entry.id, "s1");
  assert.equal(entry.title, "Emboscada");
  assert.equal(entry.date, "");
  assert.equal(entry.body, "Doze soldados");
  assert.equal(entry.people, "");
  assert.equal(entry.todos.length, 2);
  assert.equal(entry.todos[0].done, true);
  assert.equal(entry.todos[1].done, false);
  assert.ok(entry.todos[1].id);
});

test("busca ignora acento e maiúscula e olha pendências", () => {
  const entry = { ...newJournalEntry("2026-10-31"), title: "A emboscada", place: "Estrada", todos: [{ id: "t", text: "Conferir a Fúria", done: false }] };
  assert.ok(matchesJournal(entry, "furia"));
  assert.ok(matchesJournal(entry, "EMBOSCADA estrada"));
  assert.ok(!matchesJournal(entry, "dragão"));
  assert.ok(matchesJournal(entry, "  "));
});

test("conta só pendências abertas e escritas", () => {
  const entry = { ...newJournalEntry(), todos: [{ id: "a", text: "x", done: false }, { id: "b", text: "y", done: true }, { id: "c", text: " ", done: false }] };
  assert.equal(openTodos(entry), 1);
});
