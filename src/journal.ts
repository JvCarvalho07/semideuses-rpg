// Diário da campanha: uma entrada por sessão, guardada dentro da própria ficha.
// Sem imports de runtime, para o Node rodar os testes direto.

export type JournalTodo = { id: string; text: string; done: boolean };

export type JournalEntry = {
  id: string;
  title: string;
  /** AAAA-MM-DD */
  date: string;
  people: string;
  place: string;
  body: string;
  todos: JournalTodo[];
};

const ROMAN: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/** Número da sessão em algarismos romanos (1 → I, 8 → VIII). */
export function toRoman(value: number): string {
  let rest = Math.max(1, Math.floor(value));
  let out = "";
  for (const [amount, letters] of ROMAN) {
    while (rest >= amount) { out += letters; rest -= amount; }
  }
  return out;
}

function journalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Data de hoje no fuso local, no formato AAAA-MM-DD. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function newJournalEntry(date = todayIso()): JournalEntry {
  return { id: journalId("sessao"), title: "", date, people: "", place: "", body: "", todos: [] };
}

export function newJournalTodo(text = ""): JournalTodo {
  return { id: journalId("pendencia"), text, done: false };
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10-31" → "31 de outubro de 2026" (ou sem o ano, se `withYear` for falso). */
export function formatJournalDate(iso: string, withYear = true): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "sem data";
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return "sem data";
  return withYear ? `${Number(day)} de ${name} de ${year}` : `${Number(day)} de ${name}`;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Aceita o que vier do JSON e devolve entradas válidas, sem perder texto. */
export function normalizeJournal(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      id: text(item.id) || journalId("sessao"),
      title: text(item.title),
      date: /^\d{4}-\d{2}-\d{2}$/.test(text(item.date)) ? text(item.date) : "",
      people: text(item.people),
      place: text(item.place),
      body: text(item.body),
      todos: (Array.isArray(item.todos) ? item.todos : [])
        .filter((todo): todo is Record<string, unknown> => Boolean(todo) && typeof todo === "object")
        .map((todo) => ({ id: text(todo.id) || journalId("pendencia"), text: text(todo.text), done: todo.done === true })),
    }));
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca sem diferenciar acento nem maiúscula, em título, texto, pessoas, lugar e pendências. */
export function matchesJournal(entry: JournalEntry, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold([entry.title, entry.body, entry.people, entry.place, ...entry.todos.map((todo) => todo.text)].join(" "));
  return words.every((word) => haystack.includes(word));
}

export function openTodos(entry: JournalEntry): number {
  return entry.todos.filter((todo) => !todo.done && todo.text.trim()).length;
}
