import { useState } from "react";
import type { Ability } from "../model";
import { signed } from "../rules";
import { BESTIARY, makeSummons, presetAbility, type Summon, type SummonPreset } from "../summons";

const ART_BASE = `${import.meta.env.BASE_URL}assets/`;

/** Arte pintada de cada tipo de criatura (gerada para o site, retrato 2:3). */
const cardSrc = (art: string, size: 480 | 800) => `${ART_BASE}summons/card-${art || "criatura"}-${size}.webp`;

function Art({ art, sizes, className }: { art: string; sizes: string; className?: string }) {
  return (
    <img
      className={className}
      src={cardSrc(art, 480)}
      srcSet={`${cardSrc(art, 480)} 480w, ${cardSrc(art, 800)} 800w`}
      sizes={sizes}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

const ATTRIBUTES = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];
const modifier = (value: number) => {
  const mod = Math.floor((value - 10) / 2);
  return mod < 0 ? `–${Math.abs(mod)}` : `+${mod}`;
};

const NUMBER_FIELDS: Array<{ key: "hpMax" | "ca" | "speed" | "attackBonus" | "save"; label: string }> = [
  { key: "hpMax", label: "PV máx." },
  { key: "ca", label: "CA" },
  { key: "speed", label: "Deslocamento (m)" },
  { key: "attackBonus", label: "Bônus de ataque" },
  { key: "save", label: "Bônus de TR" },
];

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = {
  edit: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>,
  hourglass: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></svg>,
  rise: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M12 20V5M6 11l6-6 6 6M5 20h14" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
};

function SummonCard({ summon, kind, startOpen, onUpdate, onRemove }: { summon: Summon; kind: string; startOpen: boolean; onUpdate: (summon: Summon) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const update = <K extends keyof Summon>(key: K, value: Summon[K]) => onUpdate({ ...summon, [key]: value });
  const setHp = (value: number) => update("hp", Math.min(summon.hpMax, Math.max(0, Math.round(value) || 0)));
  const down = summon.hp <= 0;
  const ratio = Math.max(0, Math.min(1, summon.hp / Math.max(1, summon.hpMax)));
  const hurt = !down && ratio <= 0.5;
  const entry = BESTIARY[summon.art];
  const type = entry?.type ?? (kind ? kind[0].toUpperCase() + kind.slice(1) : "Criatura");
  const attributes = entry?.attributes.map((value, index) => ({ label: ATTRIBUTES[index], value })).filter((item) => item.value !== null) ?? [];
  const damage = [summon.damage, summon.damageType].filter(Boolean).join(" ");

  return (
    <article className={`summon-card ${down ? "is-down" : ""} ${hurt ? "is-hurt" : ""}`}>
      <div className="summon-art-frame">
        <Art art={summon.art} className="summon-art" sizes="(max-width: 700px) 92vw, 380px" />
        <button type="button" className="summon-edit" aria-expanded={open} aria-label={open ? "Fechar edição" : `Editar ${summon.name}`} onClick={() => setOpen(!open)}>{Icon.edit}</button>
        {down && <span className="summon-fallen">Caiu</span>}
      </div>

      <div className="summon-block">
        <header className="summon-head">
          <h3>{summon.name || "Criatura"}</h3>
          <p>{type} · {summon.source || "invocação"}</p>
        </header>

        <div className="summon-vitals">
          <div className="summon-hp">
            <span className="summon-key">PV</span>
            <label>
              <span className="sr-only">PV atuais de {summon.name}</span>
              <input type="number" min={0} max={summon.hpMax} value={summon.hp} onChange={(event) => setHp(Number(event.target.value))} />
            </label>
            <span className="summon-hp-max">/ {summon.hpMax}</span>
            <div className="summon-steps">
              <button type="button" onClick={() => setHp(summon.hp - 1)} aria-label={`Tirar 1 PV de ${summon.name}`}>−</button>
              <button type="button" onClick={() => setHp(summon.hp + 1)} aria-label={`Somar 1 PV a ${summon.name}`}>+</button>
            </div>
          </div>
          <div className="summon-bar" role="meter" aria-label="PV" aria-valuemin={0} aria-valuemax={summon.hpMax} aria-valuenow={summon.hp}><i style={{ width: `${ratio * 100}%` }} /></div>
          <p className="summon-line"><b>CA</b> {summon.ca}<span aria-hidden="true">|</span><b>Velocidade</b> {summon.speed ? `${summon.speed} m` : "imóvel"}<span aria-hidden="true">|</span><b>TR</b> {signed(summon.save)}</p>
        </div>

        {attributes.length > 0 && (
          <table className="summon-attributes">
            <thead><tr>{attributes.map((item) => <th key={item.label} scope="col">{item.label}</th>)}</tr></thead>
            <tbody><tr>{attributes.map((item) => <td key={item.label}>{item.value} ({modifier(item.value as number)})</td>)}</tr></tbody>
          </table>
        )}
        {entry?.defenses && <p className="summon-defenses">{entry.defenses}</p>}

        {(entry?.traits.length || summon.notes) ? (
          <section className="summon-part">
            <h4>Traços</h4>
            {entry?.traits.map((trait) => <p key={trait.name}><b>{trait.name}.</b> {trait.text}</p>)}
            {summon.notes && <p><b>Invocação.</b> {summon.notes}</p>}
          </section>
        ) : null}

        <section className="summon-part">
          <h4>Ações</h4>
          <p><b>Golpe.</b> Ataque {signed(summon.attackBonus)}.{damage && <> Acerto: {damage}.</>}</p>
        </section>

        {entry && <p className="summon-source">Base: {entry.base}, Livro do Mestre. Números de combate pela regra de invocação.</p>}

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
                <span className="summons-call-photo"><Art art={preset.art} sizes="48px" /></span>
                <span className="summons-call-text"><b>{preset.ability}{preset.count && preset.count > 1 ? ` (${preset.count})` : ""}</b>{meta && <small>{meta}</small>}</span>
              </button>
            );
          })}
          <button type="button" className="summons-call is-ghost" onClick={() => add(null)}>
            <span className="summons-call-plus">{Icon.plus}</span>
            <span className="summons-call-text"><b>Outra criatura</b><small>números livres</small></span>
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
