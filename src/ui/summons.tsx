import { useState } from "react";
import type { Ability } from "../model";
import { signed } from "../rules";
import { makeSummons, presetAbility, type Summon, type SummonPreset } from "../summons";

const ART_BASE = `${import.meta.env.BASE_URL}assets/`;
const artSrc = (art: string) => `${ART_BASE}summon-${art || "criatura"}.webp`;

const NUMBER_FIELDS: Array<{ key: "hpMax" | "ca" | "speed" | "attackBonus" | "save"; label: string }> = [
  { key: "hpMax", label: "PV máx." },
  { key: "ca", label: "CA" },
  { key: "speed", label: "Deslocamento (m)" },
  { key: "attackBonus", label: "Bônus de ataque" },
  { key: "save", label: "Bônus de TR" },
];

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = {
  swords: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" /><path d="M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2" /></svg>,
  more: <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  hourglass: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></svg>,
  rise: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M12 20V5M6 11l6-6 6 6M5 20h14" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
};

/** Ramo de louro desenhado (um lado; o outro é espelhado no CSS). */
function Laurel({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 40 100" aria-hidden="true">
      <path d="M30 96C14 78 9 52 18 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[14, 28, 42, 56, 70, 84].map((y, index) => (
        <g key={y} fill="currentColor">
          <ellipse cx={index % 2 ? 26 : 9} cy={y} rx="7" ry="3.2" transform={`rotate(${index % 2 ? -35 : 35} ${index % 2 ? 26 : 9} ${y})`} />
        </g>
      ))}
    </svg>
  );
}

const ARC = Math.PI * 80;

function HpArc({ hp, max }: { hp: number; max: number }) {
  const filled = Math.max(0, Math.min(1, hp / Math.max(1, max))) * ARC;
  return (
    <svg className="summon-arc" viewBox="0 0 196 104" aria-hidden="true">
      <path className="summon-arc-track" d="M18 96 A80 80 0 0 1 178 96" />
      {filled > 0 && <path className="summon-arc-value" d="M18 96 A80 80 0 0 1 178 96" strokeDasharray={`${filled} ${ARC}`} />}
    </svg>
  );
}

function Badge({ shape, value, label }: { shape: "shield" | "round" | "hex"; value: string; label: string }) {
  const path = shape === "shield"
    ? "M30 3 55 10v22c0 15-11 25-25 31C16 57 5 47 5 32V10z"
    : shape === "hex"
      ? "M17 4h26l14 30-14 30H17L3 34z"
      : "";
  return (
    <div className={`summon-badge is-${shape}`}>
      <svg viewBox="0 0 60 68" aria-hidden="true">
        {shape === "round" ? <circle cx="30" cy="34" r="27" /> : <path d={path} />}
      </svg>
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

function SummonCard({ summon, kind, startOpen, onUpdate, onRemove }: { summon: Summon; kind: string; startOpen: boolean; onUpdate: (summon: Summon) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const update = <K extends keyof Summon>(key: K, value: Summon[K]) => onUpdate({ ...summon, [key]: value });
  const setHp = (value: number) => update("hp", Math.min(summon.hpMax, Math.max(0, Math.round(value) || 0)));
  const down = summon.hp <= 0;
  return (
    <article className={`summon-card ${down ? "is-down" : ""}`}>
      <button type="button" className="summon-more" aria-expanded={open} aria-label={open ? "Fechar edição" : `Editar ${summon.name}`} onClick={() => setOpen(!open)}>{Icon.more}</button>
      <div className="summon-portrait">
        <Laurel className="summon-laurel is-left" />
        <img src={artSrc(summon.art)} width={160} height={160} alt="" loading="lazy" decoding="async" />
        <Laurel className="summon-laurel is-right" />
        {down && <span className="summon-fallen">Caiu</span>}
      </div>
      <div className="summon-body">
        <header className="summon-head">
          <h3>{summon.name || "Criatura"}</h3>
          <span className="summon-source">{[summon.source || "Invocação", kind].filter(Boolean).join(" · ")}</span>
        </header>
        <div className="summon-life">
          <button type="button" className="summon-step" onClick={() => setHp(summon.hp - 1)} aria-label="Tirar 1 PV">−</button>
          <div className="summon-gauge">
            <HpArc hp={summon.hp} max={summon.hpMax} />
            <label className="summon-hp-value">
              <span className="sr-only">PV atuais de {summon.name}</span>
              <input type="number" min={0} max={summon.hpMax} value={summon.hp} onChange={(event) => setHp(Number(event.target.value))} />
              <small>de {summon.hpMax} PV</small>
            </label>
          </div>
          <button type="button" className="summon-step" onClick={() => setHp(summon.hp + 1)} aria-label="Somar 1 PV">+</button>
        </div>
        <div className="summon-divider" aria-hidden="true"><i /></div>
        <div className="summon-badges">
          <Badge shape="shield" value={String(summon.ca)} label="CA" />
          <Badge shape="round" value={summon.speed ? `${summon.speed} m` : "—"} label={summon.speed ? "Desloc." : "Imóvel"} />
          <Badge shape="hex" value={signed(summon.save)} label="Resist." />
        </div>
        <p className="summon-attack">
          {Icon.swords}
          <span><b>{signed(summon.attackBonus)} para acertar</b>{summon.damage && <> · <b>{summon.damage}</b></>}{summon.damageType && <em> {summon.damageType}</em>}</span>
        </p>
        {summon.notes && <p className="summon-note">{summon.notes}</p>}
        {down && (
          <div className="summon-down-actions">
            <button type="button" onClick={onRemove}>{Icon.trash}Dispensar</button>
            <button type="button" className="is-primary" title="Volta com PV cheio. Conta como uma nova invocação: pague o custo da habilidade." onClick={() => setHp(summon.hpMax)}>{Icon.rise}Reerguer</button>
          </div>
        )}
      </div>
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
          {!down && <button type="button" className="remove-action" onClick={onRemove}>Dispensar</button>}
        </div>
      )}
    </article>
  );
}

/** Criaturas em campo: cada uma com PV próprios e os números do livro já calculados. */
export function SummonsSection({
  summons,
  presets,
  abilities,
  limit,
  level,
  castingModifier,
  proficiency,
  ownerName,
  filiation,
  onChange,
}: {
  summons: Summon[];
  presets: SummonPreset[];
  abilities: Ability[];
  limit: number;
  level: number;
  castingModifier: number;
  proficiency: number;
  ownerName: string;
  filiation: string;
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
  const owner = ownerName.trim();
  const subtitle = filiation === "Hades"
    ? `Os mortos${owner ? ` de ${owner}` : ""}, com os números do livro`
    : `As criaturas${owner ? ` de ${owner}` : ""}, com os números do livro`;
  const kindOf = (summon: Summon) => presets.find((preset) => preset.ability === summon.source)?.kind ?? "";

  return (
    <section className={`effects-section summons-section reveal-section ${summons.length ? "" : "no-print"}`} id="invocacoes">
      <div className="summons-toolbar">
        <div className="summons-title">
          <h2>Invocações</h2>
          <p>{subtitle}</p>
        </div>
        <div className="summons-calls no-print">
          {presets.map((preset) => {
            const ability = presetAbility(abilities, preset);
            const meta = [ability?.activation, ability?.cost].filter((value) => value && value !== "—").join(" · ");
            return (
              <button key={preset.sourceId} type="button" className="summons-call" onClick={() => add(preset)}>
                <img src={artSrc(preset.art)} width={34} height={34} alt="" />
                <span><b>{preset.ability}{preset.count && preset.count > 1 ? ` (${preset.count})` : ""}</b>{meta && <small>{meta}</small>}</span>
              </button>
            );
          })}
          <button type="button" className="summons-call is-ghost" onClick={() => add(null)}>
            <span className="summons-call-plus">{Icon.plus}</span>
            <span><b>Outra criatura</b><small>números livres</small></span>
          </button>
        </div>
      </div>
      <div className="summons-meter">
        <span className="summons-slots" aria-hidden="true">
          {Array.from({ length: Math.max(limit, standing) }, (_, index) => <i key={index} className={index < standing ? (index < limit ? "is-on" : "is-over") : ""} />)}
        </span>
        <span className={over ? "summons-over" : ""} title={over ? "O livro permite menos criaturas ao mesmo tempo. Confira com o Mestre." : undefined}>
          {summons.length ? `${standing} de ${limit} em campo` : `até ${limit} ao mesmo tempo`}
        </span>
        {summons.length > 0 && (
          <button type="button" className="summons-end no-print" onClick={() => { if (window.confirm("Dispensar todas as criaturas? Use no fim do combate.")) onChange([]); }}>{Icon.hourglass}Fim do combate</button>
        )}
      </div>
      <div className="summons-grid">
        {summons.length === 0 && <p className="empty-state">Ninguém em campo. Toque na habilidade acima e a criatura entra com PV, CA, ataque e dano do livro, calculados pelo seu nível e pela sua Conjuração.</p>}
        {summons.map((summon) => (
          <SummonCard
            key={summon.id}
            summon={summon}
            kind={kindOf(summon)}
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
