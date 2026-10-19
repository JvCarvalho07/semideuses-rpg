// Várias fichas no mesmo navegador: um índice pequeno com o resumo de cada personagem
// e cada ficha guardada numa chave própria. Funções puras sobre um Storage, para testar no Node.
import type { CharacterSheet } from "./model";

export const LIBRARY_KEY = "semideuses-library-v1";
export const SHEET_KEY_PREFIX = "semideuses-sheet:";
/** Chave da ficha única usada antes da lista; vira a primeira ficha da lista. */
export const LEGACY_SHEET_KEY = "semideuses-sheet-v3";

export type LibraryEntry = {
  id: string;
  name: string;
  filiation: string;
  level: number;
  avatarDataUrl: string;
  updatedAt: number;
};

export type Library = { activeId: string; entries: LibraryEntry[] };

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function sheetKey(id: string) {
  return SHEET_KEY_PREFIX + id;
}

export function newSheetId() {
  return `ficha-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Resumo mostrado na lista, tirado da ficha (só o necessário para não pesar o índice). */
export function summarize(id: string, sheet: Pick<CharacterSheet, "name" | "filiation" | "level" | "avatarDataUrl">, updatedAt = Date.now()): LibraryEntry {
  return {
    id,
    name: sheet.name || "",
    filiation: sheet.filiation || "",
    level: Number.isFinite(sheet.level) ? sheet.level : 1,
    // a foto já vem reduzida pelo prepareAvatar; no índice basta como miniatura
    avatarDataUrl: sheet.avatarDataUrl && sheet.avatarDataUrl.length < 60_000 ? sheet.avatarDataUrl : "",
    updatedAt,
  };
}

function isEntry(value: unknown): value is LibraryEntry {
  const entry = value as LibraryEntry;
  return Boolean(entry) && typeof entry.id === "string" && entry.id.length > 0;
}

/**
 * Lê o índice. Se ainda não existe, cria a partir da ficha única antiga (quando houver).
 * Entradas cuja ficha sumiu do armazenamento são descartadas.
 */
export function loadLibrary(store: Store): { library: Library; migratedLegacy: boolean } {
  let parsed: Partial<Library> | null = null;
  try {
    parsed = JSON.parse(store.getItem(LIBRARY_KEY) || "null");
  } catch {
    parsed = null;
  }
  if (parsed && Array.isArray(parsed.entries)) {
    const entries = parsed.entries.filter(isEntry).filter((entry) => store.getItem(sheetKey(entry.id)) !== null);
    const activeId = entries.some((entry) => entry.id === parsed!.activeId) ? String(parsed.activeId) : entries[0]?.id ?? "";
    return { library: { activeId, entries }, migratedLegacy: false };
  }

  const legacy = store.getItem(LEGACY_SHEET_KEY);
  if (legacy) {
    let summary: Partial<CharacterSheet> = {};
    try {
      summary = JSON.parse(legacy);
    } catch {
      return { library: { activeId: "", entries: [] }, migratedLegacy: false };
    }
    const id = newSheetId();
    store.setItem(sheetKey(id), legacy);
    const library = { activeId: id, entries: [summarize(id, { name: String(summary.name || ""), filiation: String(summary.filiation || ""), level: Number(summary.level) || 1, avatarDataUrl: String(summary.avatarDataUrl || "") })] };
    store.setItem(LIBRARY_KEY, JSON.stringify(library));
    return { library, migratedLegacy: true };
  }
  return { library: { activeId: "", entries: [] }, migratedLegacy: false };
}

export function readSheet(store: Store, id: string): unknown {
  const raw = store.getItem(sheetKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Grava a ficha e atualiza o resumo dela no índice. Lança erro se o navegador estiver sem espaço. */
export function writeSheet(store: Store, library: Library, id: string, sheet: CharacterSheet, updatedAt = Date.now()): Library {
  store.setItem(sheetKey(id), JSON.stringify(sheet));
  const entry = summarize(id, sheet, updatedAt);
  const exists = library.entries.some((item) => item.id === id);
  const next: Library = {
    activeId: id,
    entries: exists ? library.entries.map((item) => (item.id === id ? entry : item)) : [...library.entries, entry],
  };
  store.setItem(LIBRARY_KEY, JSON.stringify(next));
  return next;
}

export function setActive(store: Store, library: Library, id: string): Library {
  const next = { ...library, activeId: id };
  store.setItem(LIBRARY_KEY, JSON.stringify(next));
  return next;
}

export function removeSheet(store: Store, library: Library, id: string): Library {
  store.removeItem(sheetKey(id));
  const entries = library.entries.filter((item) => item.id !== id);
  const activeId = library.activeId === id ? entries[0]?.id ?? "" : library.activeId;
  const next = { activeId, entries };
  store.setItem(LIBRARY_KEY, JSON.stringify(next));
  return next;
}

/** Fichas com o mesmo nome (sem diferenciar acento ou caixa), para oferecer substituir em vez de duplicar. */
export function findByName(library: Library, name: string): LibraryEntry | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  return library.entries.find((entry) => normalizeName(entry.name) === key);
}

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Ordem da lista: a editada mais recentemente primeiro. */
export function sortedEntries(library: Library): LibraryEntry[] {
  return [...library.entries].sort((a, b) => b.updatedAt - a.updatedAt);
}
