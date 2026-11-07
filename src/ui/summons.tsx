import { useState } from "react";
import { signed } from "../rules";
import { makeSummons, type Summon, type SummonPreset } from "../summons";

const NUMBER_FIELDS: Array<{ key: "hpMax" | "ca" | "speed" | "attackBonus" | "save"; label: string }> = [
  { key: "hpMax", label: "PV máx." },
  { key: "ca", label: "CA" },
  { key: "speed", label: "Deslocamento (m)" },
  { key: "attackBonus", label: "Bônus de ataque" },
  { key: "save", label: "Bônus de TR" },
];

function SummonCard({ summon, startOpen, onUpdate, onRemove }: { summon: Summon; startOpen: boolean; onUpdate: (summon: Summon) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const update = <K extends keyof Summon>(key: K, value: Summon[K]) => onUpdate({ ...summon, [key]: value });
  const setHp = (value: number) => update("hp", Math.min(summon.hpMax, Math.max(0, Math.round(value) || 0)));
  const down = summon.hp <= 0;
  const percent = Math.round((summon.hp / Math.max(1, summon.hpMax)) * 100);
  const damage = [summon.damage, summon.damageType].filter(Boolean).join(" ");
  return (
    <article className={`summon-card ${down ? "is-down" : ""}`}>
      <div className="summon-main">
        <div className="summon-title">
          <strong>{summon.name || "Criatura"}</strong>
          <small>{down ? "Caiu: some ao chegar a 0 PV" : summon.source || "Invocação"}</small>
        </div>
        <div className="summon-hp" aria-label={`PV de ${summon.name}`}>
          <button type="button" onClick={() => setHp(summon.hp - 1)} aria-label="Tirar 1 PV">−</button>
          <label>
            <span className="sr-only">PV atuais</span>
            <input type="number" min={0} max={summon.hpMax} value={summon.hp} onChange={(event) => setHp(Number(event.target.value))} />
          </label>
          <span className="summon-hp-max">/ {summon.hpMax}</span>
          <button type="button" onClick={() => setHp(summon.hp + 1)} aria-label="Somar 1 PV">+</button>
          <span className="summon-bar" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
        </div>
        <dl className="summon-stats">
          <div><dt>CA</dt><dd>{summon.ca}</dd></div>
          <div><dt>Desl.</dt><dd>{summon.speed ? `${summon.speed} m` : "imóvel"}</dd></div>
          <div><dt>Ataque</dt><dd>{signed(summon.attackBonus)}</dd></div>
          {damage && <div className="wide"><dt>Dano</dt><dd>{damage}</dd></div>}
          <div><dt>TR</dt><dd>{signed(summon.save)}</dd></div>
        </dl>
        <div className="summon-actions">
          <button type="button" className="row-edit" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Fechar" : "Editar"}</button>
          <button type="button" className="row-edit summon-dismiss" onClick={onRemove}>Dispensar</button>
        </div>
      </div>
      {summon.notes && !open && <p className="summon-notes">{summon.notes}</p>}
      {open && (
        <div className="effect-editor summon-editor">
          <label className="span-2">Nome<input value={summon.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className="span-2">Habilidade que invocou<input value={summon.source} placeholder="ex.: Erguer Morto" onChange={(event) => update("source", event.target.value)} /></label>
          {NUMBER_FIELDS.map((field) => (
            <label key={field.key}>{field.label}
              <input
                type="number"
                value={summon[field.key]}
                onChange={(event) => {
                  const value = Math.round(Number(event.target.value)) || 0;
                  if (field.key === "hpMax") onUpdate({ ...summon, hpMax: Math.max(1, value), hp: Math.min(summon.hp, Math.max(1, value)) });
                  else update(field.key, field.key === "speed" ? Math.max(0, value) : value);
                }}
              />
            </label>
          ))}
          <label>Dano<input value={summon.damage} placeholder="1d8 + 4" onChange={(event) => update("damage", event.target.value)} /></label>
          <label>Tipo de dano<input value={summon.damageType} placeholder="Necrótico" onChange={(event) => update("damageType", event.target.value)} /></label>
          <label className="span-full">Anotações<textarea value={summon.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        </div>
      )}
    </article>
  );
}

/** Criaturas em campo: cada uma com PV próprios e os números do livro já calculados. */
export function SummonsSection({
  summons,
  presets,
  limit,
  level,
  castingModifier,
  proficiency,
  onChange,
}: {
  summons: Summon[];
  presets: SummonPreset[];
  limit: number;
  level: number;
  castingModifier: number;
  proficiency: number;
  onChange: (summons: Summon[]) => void;
}) {
  const [freshId, setFreshId] = useState<string | null>(null);
  if (!presets.length && !summons.length) return null;

  const add = (preset: SummonPreset | null) => {
    const created = makeSummons(preset, level, castingModifier, proficiency, summons);
    setFreshId(preset ? null : created[0]?.id ?? null);
    onChange([...summons, ...created]);
  };
  const standing = summons.filter((summon) => summon.hp > 0).length;
  const over = standing > limit;

  return (
    <section className={`effects-section summons-section reveal-section ${summons.length ? "" : "no-print"}`} id="invocacoes">
      <div className="section-toolbar">
        <h2>Invocações</h2>
        <span className={`effects-count ${over ? "summons-over" : ""}`} title={over ? "O livro permite menos criaturas ao mesmo tempo. Confira com o Mestre." : undefined}>
          {summons.length ? `${standing} de ${limit} em campo` : `até ${limit} ao mesmo tempo`}
        </span>
        <div className="effects-add no-print">
          {presets.map((preset) => (
            <button key={preset.sourceId} type="button" className="large-add" onClick={() => add(preset)}>
              {preset.ability}{preset.count && preset.count > 1 ? ` (${preset.count})` : ""}
            </button>
          ))}
          <button type="button" className="large-add summons-other" onClick={() => add(null)}>Outra criatura</button>
          {summons.length > 0 && (
            <button type="button" className="large-add summons-clear" onClick={() => { if (window.confirm("Dispensar todas as criaturas? Use no fim do combate.")) onChange([]); }}>Fim do combate</button>
          )}
        </div>
      </div>
      <div className="effects-list summons-list">
        {summons.length === 0 && <p className="empty-state">Ninguém em campo. Toque na habilidade acima e a criatura entra com PV, CA, ataque e dano do livro, calculados pelo seu nível e pela sua Conjuração.</p>}
        {summons.map((summon) => (
          <SummonCard
            key={summon.id}
            summon={summon}
            startOpen={summon.id === freshId}
            onUpdate={(updated) => onChange(summons.map((entry) => (entry.id === summon.id ? updated : entry)))}
            onRemove={() => onChange(summons.filter((entry) => entry.id !== summon.id))}
          />
        ))}
      </div>
      <div className="effects-print print-only">
        {summons.map((summon) => (
          <article key={`print-${summon.id}`}>
            <header><strong>{summon.name}</strong><span>{summon.source ? `${summon.source} · ` : ""}PV {summon.hp}/{summon.hpMax} · CA {summon.ca} · {summon.speed ? `${summon.speed} m` : "imóvel"} · Ataque {signed(summon.attackBonus)}{summon.damage ? ` · ${[summon.damage, summon.damageType].filter(Boolean).join(" ")}` : ""} · TR {signed(summon.save)}</span></header>
            {summon.notes && <p>{summon.notes}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
