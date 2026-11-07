import { useState } from "react";
import { ASSETS } from "../assets";
import type { Ability } from "../model";
import { signed } from "../rules";
import { makeSummons, presetAbility, type Summon, type SummonPreset } from "../summons";

const ART_BASE = `${import.meta.env.BASE_URL}assets/`;
const sealSrc = (art: string) => `${ART_BASE}summon-${art || "criatura"}.webp`;

type Plate = { id: string; wide: boolean; focus: string; credit: string; licence: string; page: string };

/** Fotografias de peças gregas de museu (Wikimedia Commons), uma por tipo de criatura. */
const PLATES: Record<string, Plate> = {
  servo: { id: "f60424081", wide: true, focus: "50% 42%", credit: "Elmo coríntio, Metropolitan Museum", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Bronze_helmet_of_Corinthian_type_MET_DP105637.jpg" },
  esqueleto: { id: "f16888390", wide: false, focus: "50% 34%", credit: "Mosaico Carpe Diem, Museu de Nápoles", licence: "domínio público", page: "https://commons.wikimedia.org/wiki/File:Carpe_Diem_MAN_Napoli_Inv9978.jpg" },
  cao: { id: "f2192736", wide: true, focus: "60% 58%", credit: "Hidria de Cérbero, Louvre", licence: "domínio público", page: "https://commons.wikimedia.org/wiki/File:Herakles_Kerberos_Eurystheus_Louvre_E701.jpg" },
  automato: { id: "f22906318", wide: true, focus: "46% 38%", credit: "Vaso de Talos, Forzaruvo94", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Vaso_di_Talos_particolare.JPG" },
  torreta: { id: "f7246353", wide: true, focus: "42% 58%", credit: "Artilharia antiga, SBA73", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Ancient_Mechanical_Artillery._Pic_01.jpg" },
  corcel: { id: "f33004484", wide: false, focus: "44% 58%", credit: "Mosaico do hipocampo, Carole Raddato", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Mosaic_with_Hippocamp,_a_mythological_creature_with_hybrid_body,_half_horse_and_half_fish,_from_S%C3%A3o_Sebasti%C3%A3o_do_Freixo,_National_Archaeology_Museum_of_Lisbon,_Portugal_(13188929355).jpg" },
  cacadora: { id: "f1734884", wide: true, focus: "62% 28%", credit: "Diana de Versalhes, Louvre", licence: "domínio público", page: "https://commons.wikimedia.org/wiki/File:Detail_Diana_Versailles_Louvre_Ma589.jpg" },
  loba: { id: "f145564917", wide: true, focus: "34% 44%", credit: "Loba Capitolina, Roma", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Lupa_Capitolina,_Rome.jpg" },
  criatura: { id: "f45894444", wide: false, focus: "55% 38%", credit: "Lécito com Caronte, Carole Raddato", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Attic_Red_Figure_(White_Ground)_Lekythos_with_Charon,_attributed_to_the_Tymbos_painter,_ca_500_-_450_BC,_Ashmolean_Museum,_Oxford,_UK_(22681344331).jpg" },
};
const plateFor = (art: string) => PLATES[art] ?? PLATES.criatura;
const photoSrc = (plate: Plate, size: 500 | 960) => `${ART_BASE}summons/photo-${plate.id}-${size}.webp`;

function Photo({ art, sizes, className }: { art: string; sizes: string; className?: string }) {
  const plate = plateFor(art);
  return (
    <img
      className={className}
      src={photoSrc(plate, 500)}
      srcSet={plate.wide ? `${photoSrc(plate, 500)} 500w, ${photoSrc(plate, 960)} 960w` : undefined}
      sizes={plate.wide ? sizes : undefined}
      style={{ objectPosition: plate.focus }}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

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
  return (
    <article className={`summon-card ${down ? "is-down" : ""} ${hurt ? "is-hurt" : ""}`}>
      <div className="summon-photo">
        <Photo art={summon.art} sizes="(max-width: 700px) 92vw, 360px" />
        <img className="summon-seal" src={sealSrc(summon.art)} width={56} height={56} alt="" loading="lazy" decoding="async" />
        <button type="button" className="summon-edit" aria-expanded={open} aria-label={open ? "Fechar edição" : `Editar ${summon.name}`} onClick={() => setOpen(!open)}>{Icon.edit}</button>
        <div className="summon-plate">
          <h3>{summon.name || "Criatura"}</h3>
          <span>{[summon.source || "Invocação", kind].filter(Boolean).join(" · ")}</span>
        </div>
        {down && <span className="summon-fallen">Caiu</span>}
      </div>
      <div className="summon-body">
        <div className="summon-life">
          <label className="summon-hp-value">
            <span className="sr-only">PV atuais de {summon.name}</span>
            <input type="number" min={0} max={summon.hpMax} value={summon.hp} onChange={(event) => setHp(Number(event.target.value))} />
            <small>/ {summon.hpMax} PV</small>
          </label>
          <div className="summon-steps">
            <button type="button" onClick={() => setHp(summon.hp - 1)} aria-label={`Tirar 1 PV de ${summon.name}`}>−</button>
            <button type="button" onClick={() => setHp(summon.hp + 1)} aria-label={`Somar 1 PV a ${summon.name}`}>+</button>
          </div>
        </div>
        <div className="summon-bar" role="meter" aria-label="PV" aria-valuemin={0} aria-valuemax={summon.hpMax} aria-valuenow={summon.hp}><i style={{ width: `${ratio * 100}%` }} /></div>
        <dl className="summon-stats">
          <div><img src={ASSETS.stats.armor.src} width={30} height={30} alt="" /><dt>CA</dt><dd>{summon.ca}</dd></div>
          <div><img src={ASSETS.stats.speed.src} width={30} height={30} alt="" /><dt>{summon.speed ? "Desloc." : "Imóvel"}</dt><dd>{summon.speed ? `${summon.speed} m` : "—"}</dd></div>
          <div><img src={ASSETS.stats.savingThrows.src} width={30} height={30} alt="" /><dt>Resist.</dt><dd>{signed(summon.save)}</dd></div>
        </dl>
        <p className="summon-attack">
          {Icon.swords}
          <span><b>{signed(summon.attackBonus)}</b> para acertar{summon.damage && <> · <b>{summon.damage}</b></>}{summon.damageType && <em> {summon.damageType}</em>}</span>
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
  const shownArts = [...new Set(summons.map((summon) => summon.art || "criatura"))];

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
                <span className="summons-call-photo"><Photo art={preset.art} sizes="44px" /></span>
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
      {shownArts.length > 0 && (
        <p className="summons-credits no-print">
          Fotos, Wikimedia Commons:{" "}
          {shownArts.map((art, index) => {
            const plate = plateFor(art);
            return <span key={art}>{index > 0 && "; "}<a href={plate.page} target="_blank" rel="noreferrer">{plate.credit}</a> ({plate.licence})</span>;
          })}
        </p>
      )}
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
