import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  formatJournalDate,
  matchesJournal,
  newJournalEntry,
  newJournalTodo,
  openTodos,
  toRoman,
  type JournalEntry,
  type JournalTodo,
} from "../journal";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Icon = {
  close: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  search: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  people: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2" /><path d="M16 4.6a3.2 3.2 0 0 1 0 6.3M21 20c-.4-2.6-1.8-4.2-3.8-4.9" /></svg>,
  place: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>,
  box: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><rect x="4" y="4" width="16" height="16" rx="2.5" /></svg>,
  boxDone: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 12.5l2.8 2.8L16.5 9" /></svg>,
  saved: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></svg>,
};

/** Livro de anotações da campanha: sessões à esquerda, a sessão aberta à direita. */
export function JournalBook({
  open,
  ownerName,
  entries,
  onClose,
  onChange,
}: {
  open: boolean;
  ownerName: string;
  entries: JournalEntry[];
  onClose: () => void;
  onChange: (entries: JournalEntry[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const todoRefs = useRef(new Map<string, HTMLInputElement>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A entrada aberta: a escolhida, ou a mais recente.
  const active = entries.find((entry) => entry.id === activeId) ?? entries[entries.length - 1] ?? null;
  const number = active ? entries.indexOf(active) + 1 : 0;
  const listed = useMemo(
    () => entries.map((entry, index) => ({ entry, number: index + 1 })).filter(({ entry }) => matchesJournal(entry, query)).reverse(),
    [entries, query],
  );

  // Foca uma pendência assim que o React desenhar a linha nova (antes da próxima tecla).
  const pendingFocus = useRef<string | null>(null);
  const focusTodo = (id: string) => { pendingFocus.current = id; };
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const node = todoRefs.current.get(id);
    if (!node) return;
    pendingFocus.current = null;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  });
  // Uma função de ref fixa por pendência, para o React não trocar a ref a cada tecla.
  const refBinders = useRef(new Map<string, (node: HTMLInputElement | null) => void>());
  const bindTodo = (id: string) => {
    let bind = refBinders.current.get(id);
    if (!bind) {
      bind = (node) => {
        if (node) todoRefs.current.set(id, node);
        else { todoRefs.current.delete(id); refBinders.current.delete(id); }
      };
      refBinders.current.set(id, bind);
    }
    return bind;
  };

  const update = (patch: Partial<JournalEntry>) => {
    if (!active) return;
    onChange(entries.map((entry) => (entry.id === active.id ? { ...entry, ...patch } : entry)));
  };
  const updateTodos = (todos: JournalTodo[]) => update({ todos });

  const addEntry = () => {
    const entry = newJournalEntry();
    onChange([...entries, entry]);
    setActiveId(entry.id);
    setQuery("");
    window.setTimeout(() => titleRef.current?.focus(), 0);
  };

  const removeEntry = () => {
    if (!active) return;
    const label = active.title.trim() || `Sessão ${toRoman(number)}`;
    if (!window.confirm(`Apagar "${label}" do diário? Isso não pode ser desfeito.`)) return;
    onChange(entries.filter((entry) => entry.id !== active.id));
    setActiveId(null);
  };

  const addTodo = (after?: string) => {
    if (!active) return;
    const todo = newJournalTodo();
    const index = after ? active.todos.findIndex((item) => item.id === after) + 1 : active.todos.length;
    updateTodos([...active.todos.slice(0, index), todo, ...active.todos.slice(index)]);
    focusTodo(todo.id);
  };

  const todoKeys = (event: KeyboardEvent<HTMLInputElement>, todo: JournalTodo, index: number) => {
    if (!active) return;
    if (event.key === "Enter") {
      event.preventDefault();
      addTodo(todo.id);
    } else if (event.key === "Backspace" && !todo.text) {
      event.preventDefault();
      updateTodos(active.todos.filter((item) => item.id !== todo.id));
      const previous = active.todos[index - 1];
      if (previous) focusTodo(previous.id);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="journal-book"
      lang="pt-BR"
      aria-labelledby="journal-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="journal-cover">
        <button type="button" className="journal-close" onClick={onClose} aria-label="Fechar o diário">{Icon.close}</button>
        <div className="journal-pages">
          <aside className="journal-page journal-index">
            <div className="journal-head">
              <div>
                <h2 id="journal-title">Diário</h2>
                <p>{ownerName.trim() ? `A campanha de ${ownerName.trim()}` : "Anotações da campanha"}</p>
              </div>
              {entries.length > 0 && (
                <select
                  className="journal-picker"
                  aria-label="Escolher sessão"
                  value={active?.id ?? ""}
                  onChange={(event) => setActiveId(event.target.value)}
                >
                  {entries.map((entry, index) => ({ entry, n: index + 1 })).reverse().map(({ entry, n }) => (
                    <option key={entry.id} value={entry.id}>{toRoman(n)} · {entry.title.trim() || "Sem título"}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="journal-tools">
              <label className="journal-search">
                {Icon.search}
                <span className="sr-only">Buscar nas anotações</span>
                <input type="search" value={query} placeholder="Buscar nas anotações" onChange={(event) => setQuery(event.target.value)} />
              </label>
              <button type="button" className="journal-new" onClick={addEntry}>{Icon.plus}<span>Nova sessão</span></button>
            </div>
            <ul className="journal-list">
              {listed.map(({ entry, number: n }) => {
                const pending = openTodos(entry);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={entry.id === active?.id ? "is-active" : ""}
                      aria-current={entry.id === active?.id ? "true" : undefined}
                      onClick={() => setActiveId(entry.id)}
                    >
                      <span className="journal-n">{toRoman(n)}</span>
                      <span className="journal-item-text">
                        <strong>{entry.title.trim() || "Sem título"}</strong>
                        <small>{formatJournalDate(entry.date, false)}</small>
                      </span>
                      {pending > 0 && <span className="journal-pending" title={`${pending} pendência${pending > 1 ? "s" : ""} em aberto`}>{pending}</span>}
                    </button>
                  </li>
                );
              })}
              {entries.length > 0 && listed.length === 0 && <li className="journal-none">Nada encontrado para “{query}”.</li>}
            </ul>
          </aside>

          <section className="journal-page journal-sheet" aria-label="Sessão aberta">
            <span className="journal-ribbon" aria-hidden="true" />
            {active ? (
              <>
                <div className="journal-chapter">
                  <span className="journal-number" aria-label={`Sessão ${number}`}>{toRoman(number)}</span>
                  <textarea
                    ref={titleRef}
                    className="journal-title"
                    rows={1}
                    value={active.title}
                    placeholder="Título da sessão"
                    aria-label="Título da sessão"
                    onChange={(event) => update({ title: event.target.value.replace(/\n/g, " ") })}
                  />
                  <label className="journal-date">
                    <span>{formatJournalDate(active.date)}</span>
                    <input type="date" value={active.date} aria-label="Data da sessão" onChange={(event) => update({ date: event.target.value })} />
                  </label>
                </div>
                <div className="journal-rule" />
                <div className="journal-tags">
                  <label>{Icon.people}<input value={active.people} placeholder="Quem estava" aria-label="Quem estava na sessão" onChange={(event) => update({ people: event.target.value })} /></label>
                  <label>{Icon.place}<input value={active.place} placeholder="Onde" aria-label="Onde aconteceu" onChange={(event) => update({ place: event.target.value })} /></label>
                </div>
                <div className="journal-writing">
                  <textarea
                    className="journal-body"
                    value={active.body}
                    placeholder="O que aconteceu nesta sessão?"
                    aria-label="Anotações da sessão"
                    onChange={(event) => update({ body: event.target.value })}
                  />
                  <ul className="journal-todos" aria-label="Pendências">
                    {active.todos.map((todo, index) => (
                      <li key={todo.id} className={todo.done ? "is-done" : ""}>
                        <button
                          type="button"
                          aria-pressed={todo.done}
                          aria-label={todo.done ? "Desmarcar pendência" : "Marcar pendência como feita"}
                          onClick={() => updateTodos(active.todos.map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item)))}
                        >{todo.done ? Icon.boxDone : Icon.box}</button>
                        <input
                          ref={bindTodo(todo.id)}
                          value={todo.text}
                          placeholder="Pendência"
                          aria-label="Texto da pendência"
                          onChange={(event) => updateTodos(active.todos.map((item) => (item.id === todo.id ? { ...item, text: event.target.value } : item)))}
                          onKeyDown={(event) => todoKeys(event, todo, index)}
                        />
                      </li>
                    ))}
                    <li className="journal-todo-add"><button type="button" onClick={() => addTodo()}>{Icon.plus}Pendência</button></li>
                  </ul>
                </div>
                <div className="journal-foot">
                  <span>{Icon.saved}Salvo junto da ficha e no JSON</span>
                  <button type="button" onClick={removeEntry}>{Icon.trash}Apagar sessão</button>
                </div>
              </>
            ) : (
              <div className="journal-empty">
                <span className="journal-number">I</span>
                <p>O diário ainda está em branco. Anote o que acontece em cada sessão: quem estava, onde, e o que ficou pendente.</p>
                <button type="button" className="journal-new" onClick={addEntry}>{Icon.plus}<span>Começar a sessão I</span></button>
              </div>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
}
