import { useEffect, useRef } from "react";
import type { LibraryEntry } from "../library";

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function editedAgo(timestamp: number) {
  const minutes = Math.round((timestamp - Date.now()) / 60_000);
  if (Math.abs(minutes) < 1) return "editada agora";
  if (Math.abs(minutes) < 60) return `editada ${relative.format(minutes, "minute")}`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `editada ${relative.format(hours, "hour")}`;
  return `editada ${relative.format(Math.round(hours / 24), "day")}`;
}

/** Lista de personagens salvos neste navegador: abrir, criar, duplicar e apagar. */
export function LibraryPanel({
  open,
  entries,
  activeId,
  onClose,
  onOpen,
  onNew,
  onImport,
  onDuplicate,
  onDelete,
}: {
  open: boolean;
  entries: LibraryEntry[];
  activeId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="library-panel"
      aria-labelledby="library-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="library-inner">
        <div className="library-head">
          <h2 id="library-title">Minhas fichas</h2>
          <button type="button" className="library-close" onClick={onClose} aria-label="Fechar lista de fichas">×</button>
        </div>
        <p className="library-hint">Cada personagem fica salvo neste navegador. Para levar a ficha para outro aparelho, use o botão JSON.</p>
        <ul className="library-list">
          {entries.map((entry) => {
            const active = entry.id === activeId;
            const name = entry.name || "Personagem sem nome";
            return (
              <li key={entry.id} className={active ? "is-active" : ""}>
                <button type="button" className="library-open" onClick={() => onOpen(entry.id)} aria-current={active ? "true" : undefined}>
                  <span className="library-avatar" aria-hidden="true">
                    {entry.avatarDataUrl ? <img src={entry.avatarDataUrl} alt="" /> : (entry.name.trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="library-text">
                    <strong>{name}</strong>
                    <small>{[entry.filiation || "Sem filiação", `nível ${entry.level}`].join(", ")}</small>
                    <small className="library-date">{active ? "Aberta agora" : editedAgo(entry.updatedAt)}</small>
                  </span>
                </button>
                <span className="library-actions">
                  <button type="button" onClick={() => onDuplicate(entry.id)} aria-label={`Duplicar ${name}`}>Duplicar</button>
                  <button type="button" className="danger" onClick={() => onDelete(entry.id)} aria-label={`Apagar ${name}`}>Apagar</button>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="library-foot">
          <button type="button" className="library-primary" onClick={onNew}>Nova ficha</button>
          <button type="button" onClick={onImport}>Importar JSON</button>
        </div>
      </div>
    </dialog>
  );
}
