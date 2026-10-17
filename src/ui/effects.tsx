import { useState } from "react";
import { makeId, type Effect, type EffectKind } from "../model";
import { signed } from "../rules";

const BONUS_FIELDS: Array<{ key: "ca" | "initiative" | "speed" | "hpMax"; label: string; unit?: string }> = [
  { key: "ca", label: "CA" },
  { key: "initiative", label: "Iniciativa" },
  { key: "speed", label: "Deslocamento", unit: " m" },
  { key: "hpMax", label: "PV máx." },
];

function bonusChips(effect: Effect): string[] {
  return BONUS_FIELDS.filter((field) => effect[field.key] !== 0).map((field) => `${field.label} ${signed(effect[field.key])}${field.unit ?? ""}`);
}

function newEffect(kind: EffectKind): Effect {
  return { id: makeId("effect"), kind, name: "", source: "", duration: "", description: "", active: true, ca: 0, initiative: 0, speed: 0, hpMax: 0 };
}

function EffectCard({ effect, startOpen, onUpdate, onRemove }: { effect: Effect; startOpen: boolean; onUpdate: (effect: Effect) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const update = <K extends keyof Effect>(key: K, value: Effect[K]) => onUpdate({ ...effect, [key]: value });
  const chips = bonusChips(effect);
  const subtitle = [effect.source, effect.duration].filter(Boolean).join(" · ");
  return (
    <article className={`effect-card ${effect.kind === "Maldição" ? "is-curse" : "is-blessing"} ${effect.active ? "is-active" : "is-off"}`}>
      <div className="effect-main">
        <span className="effect-kind">{effect.kind}</span>
        <div className="effect-title">
          <strong>{effect.name || `Nova ${effect.kind.toLowerCase()}`}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
        {chips.length > 0 && <div className="effect-chips">{chips.map((chip) => <b key={chip}>{chip}</b>)}</div>}
        <button type="button" role="switch" aria-checked={effect.active} className={`effect-switch ${effect.active ? "on" : ""}`} onClick={() => update("active", !effect.active)}>
          {effect.active ? "Ativa" : "Desligada"}
        </button>
        <button type="button" className="row-edit" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Fechar" : "Editar"}</button>
      </div>
      {effect.description && !open && <p className="effect-description">{effect.description}</p>}
      {open && (
        <div className="effect-editor">
          <label className="span-2">Nome<input value={effect.name} placeholder={effect.kind === "Bênção" ? "ex.: Bênção de Apolo" : "ex.: Maldição de Hera"} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Tipo
            <select value={effect.kind} onChange={(event) => update("kind", event.target.value as EffectKind)}>
              <option>Bênção</option>
              <option>Maldição</option>
            </select>
          </label>
          <label>Quem concedeu ou lançou<input value={effect.source} placeholder="deus, monstro, item…" onChange={(event) => update("source", event.target.value)} /></label>
          <label>Duração<input value={effect.duration} placeholder="ex.: até o próximo Descanso Longo" onChange={(event) => update("duration", event.target.value)} /></label>
          <label className="span-full">O que faz<textarea value={effect.description} onChange={(event) => update("description", event.target.value)} /></label>
          <fieldset className="effect-bonus span-full">
            <legend>Números que mudam enquanto estiver ativa (use negativo para penalidade)</legend>
            {BONUS_FIELDS.map((field) => (
              <label key={field.key}>{field.label}<input type="number" value={effect[field.key]} onChange={(event) => update(field.key, Math.round(Number(event.target.value)) || 0)} /></label>
            ))}
          </fieldset>
          <button type="button" className="remove-action" onClick={() => { if (window.confirm(`Remover ${effect.name || "este efeito"}?`)) onRemove(); }}>Remover</button>
        </div>
      )}
    </article>
  );
}

export function EffectsSection({ effects, onChange }: { effects: Effect[]; onChange: (effects: Effect[]) => void }) {
  const [freshId, setFreshId] = useState<string | null>(null);
  const add = (kind: EffectKind) => {
    const effect = newEffect(kind);
    setFreshId(effect.id);
    onChange([...effects, effect]);
  };
  const activeCount = effects.filter((effect) => effect.active).length;
  return (
    <section className={`effects-section reveal-section ${activeCount ? "" : "no-print"}`} id="efeitos">
      <div className="section-toolbar">
        <h2>Bênçãos e maldições</h2>
        <span className="effects-count">{effects.length ? `${activeCount} ativa${activeCount === 1 ? "" : "s"} de ${effects.length}` : "nenhuma"}</span>
        <div className="effects-add">
          <button type="button" className="large-add" onClick={() => add("Bênção")}>Adicionar bênção</button>
          <button type="button" className="large-add curse" onClick={() => add("Maldição")}>Adicionar maldição</button>
        </div>
      </div>
      <div className="effects-list">
        {effects.length === 0 && <p className="empty-state">Nada por aqui. Registre dádivas de deuses, maldições e efeitos de itens; os números que você informar entram na CA, iniciativa, deslocamento e PV enquanto estiverem ativos.</p>}
        {effects.map((effect) => (
          <EffectCard key={effect.id} effect={effect} startOpen={effect.id === freshId} onUpdate={(updated) => onChange(effects.map((entry) => (entry.id === effect.id ? updated : entry)))} onRemove={() => onChange(effects.filter((entry) => entry.id !== effect.id))} />
        ))}
      </div>
      <div className="effects-print print-only">
        {effects.filter((effect) => effect.active).map((effect) => (
          <article key={`print-${effect.id}`}>
            <header><strong>{effect.name || effect.kind}</strong><span>{effect.kind}{effect.source ? ` · ${effect.source}` : ""}{effect.duration ? ` · ${effect.duration}` : ""}</span></header>
            {(effect.description || bonusChips(effect).length > 0) && <p>{[effect.description, bonusChips(effect).join(", ")].filter(Boolean).join(" — ")}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
