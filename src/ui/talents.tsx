import { useEffect, useMemo, useRef, useState } from "react";
import type { Ability, AttributeKey } from "../model";
import { SKILL_LIST } from "../rules";
import {
  OFFICIAL_TALENTS,
  TALENT_GROUPS,
  type OfficialTalent,
  isLinkedTalent,
  officialTalentFor,
  slug,
  talentAutoLabel,
  talentChoice,
  talentDescription,
} from "../officialTalents";

/** O que a lista precisa saber da ficha para conferir pré-requisitos. */
export type TalentContext = {
  level: number;
  attributes: Record<AttributeKey, number>;
  skillRanks: Record<string, number>;
  talents: Ability[];
};

const ATTRIBUTE_SHORT: Record<AttributeKey, string> = { for: "FOR", des: "DES", con: "CON", int: "INT", sab: "SAB", car: "CAR" };

/** Pré-requisito que a ficha não cumpre (texto curto) ou "" se cumpre ou não dá para conferir. */
function missingPrereq(talent: OfficialTalent, context: TalentContext): string {
  const prereq = talent.prereq;
  if (!prereq) return "";
  if (prereq.level && context.level < prereq.level) return `Precisa de nível ${prereq.level}`;
  if (prereq.attribute && (context.attributes[prereq.attribute.key] ?? 0) < prereq.attribute.min) return `Precisa de ${ATTRIBUTE_SHORT[prereq.attribute.key]} ${prereq.attribute.min}`;
  if (prereq.talent && !context.talents.some((entry) => officialTalentFor(entry)?.name === prereq.talent)) return `Precisa de ${prereq.talent}`;
  if (prereq.skill && !((context.skillRanks[prereq.skill] ?? 0) > 0)) return `Precisa de ${prereq.skill}`;
  return "";
}

/** Entrada nova na ficha a partir do talento do livro. */
export function talentEntry(talent: OfficialTalent, id: string, level: number): Ability {
  return {
    id,
    name: talent.name,
    level: Math.max(1, level),
    rank: "",
    cost: "",
    activation: "",
    range: "",
    duration: "",
    recharge: "",
    description: talentDescription(talent),
    notes: "",
    extra: { sourceId: talent.id, selectedOptions: {}, custom: false, fromCatalog: true },
  };
}

/** Lista para escolher um talento do livro: busca, grupos, resumo e avisos de pré-requisito. */
export function TalentPicker({
  open,
  context,
  onClose,
  onPick,
  onCustom,
}: {
  open: boolean;
  context: TalentContext;
  onClose: () => void;
  onPick: (talent: OfficialTalent) => void;
  onCustom: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const owned = useMemo(() => new Set(context.talents.map((entry) => officialTalentFor(entry)?.id).filter(Boolean)), [context.talents]);
  const words = slug(query).split("-").filter(Boolean);
  const matches = OFFICIAL_TALENTS.filter((talent) => {
    if (!words.length) return true;
    // Casa pelo começo das palavras: "MP" acha "1 MP", não "empurrar".
    const haystack = slug([talent.name, talent.summary, ...talent.effects, talent.group].join(" ")).split("-");
    return words.every((word) => haystack.some((part) => part.startsWith(word)));
  });

  return (
    <dialog
      ref={dialogRef}
      className="talent-picker"
      aria-labelledby="talent-picker-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="talent-picker-inner">
        <div className="talent-picker-head">
          <h2 id="talent-picker-title">Escolher talento</h2>
          <button type="button" className="library-close" onClick={onClose} aria-label="Fechar lista de talentos">×</button>
        </div>
        <label className="talent-search">
          <span className="sr-only">Buscar talento</span>
          <input ref={searchRef} type="search" value={query} placeholder="Buscar por nome ou efeito: MP, CA, iniciativa, Atletismo…" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="talent-picker-list">
          {TALENT_GROUPS.map((group) => {
            const items = matches.filter((talent) => talent.group === group);
            if (!items.length) return null;
            return (
              <section key={group} className="talent-group" aria-label={`Talentos de ${group}`}>
                <h3>{group}</h3>
                <ul>
                  {items.map((talent) => {
                    const has = owned.has(talent.id) && !talent.repeatable;
                    const missing = missingPrereq(talent, context);
                    const neutralPrereq = talent.prereq && !missing && !talent.prereq.level && !talent.prereq.attribute && !talent.prereq.talent && !talent.prereq.skill ? talent.prereq.text : "";
                    return (
                      <li key={talent.id}>
                        <button type="button" className={`talent-option ${has ? "is-owned" : ""}`} onClick={() => onPick(talent)}>
                          <strong>{talent.name}</strong>
                          <span className="talent-summary">{talent.summary.charAt(0).toUpperCase() + talent.summary.slice(1)}</span>
                          {(has || missing || neutralPrereq || talent.auto) && (
                            <span className="talent-tags">
                              {has && <em className="tag-owned">Você já tem</em>}
                              {missing && <em className="tag-missing">{missing}</em>}
                              {neutralPrereq && <em>{neutralPrereq}</em>}
                              {talent.auto && <em className="tag-auto">Conta sozinho na ficha</em>}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {!matches.length && <p className="talent-empty">Nenhum talento do livro com “{query}”. Se o Mestre criou esse talento, crie um talento próprio.</p>}
        </div>
        <div className="talent-picker-foot">
          <button type="button" onClick={onCustom}>Criar talento próprio</button>
          <small>Para talentos criados ou alterados pelo Mestre.</small>
        </div>
      </div>
    </dialog>
  );
}

/** Cartão de talento: nome, grupo e efeitos; sem os campos de habilidade (rank, custo, ação…) que talento não usa. */
export function TalentCard({
  ability,
  startOpen,
  forceOpen,
  onUpdate,
  onRemove,
}: {
  ability: Ability;
  startOpen?: boolean;
  forceOpen?: boolean;
  onUpdate: (ability: Ability) => void;
  onRemove: () => void;
}) {
  const official = officialTalentFor(ability);
  const linked = isLinkedTalent(ability);
  // Talento que já estava na ficha: mostra o texto guardado, sem trocar nada.
  const custom = !linked;
  const [mode, setMode] = useState<"compact" | "details" | "edit">(!ability.name ? "edit" : startOpen ? "details" : "compact");
  useEffect(() => {
    if (forceOpen !== undefined) setMode(forceOpen ? "details" : "compact");
  }, [forceOpen]);

  const choice = talentChoice(ability);
  const setChoice = (value: string) => {
    const extra = { ...(ability.extra || {}), sourceId: official?.id, selectedOptions: { choice: value } };
    onUpdate({ ...ability, extra });
  };
  const update = (key: keyof Ability, value: string | number) => onUpdate({ ...ability, [key]: value });
  const remove = () => {
    if (window.confirm(`Remover ${ability.name || "este talento"}?`)) onRemove();
  };
  // Editar um talento do livro guarda uma versão própria, com o texto atual como ponto de partida.
  const editOwnVersion = () => {
    if (official && linked) onUpdate({ ...ability, description: talentDescription(official), extra: { ...(ability.extra || {}), sourceId: official.id, custom: true, fromCatalog: false } });
    setMode("edit");
  };
  // Opcional: liga um talento antigo ao livro (texto do livro e efeitos automáticos). O texto antigo fica guardado.
  const useBookText = () => {
    if (!official) return;
    if (!window.confirm(`Usar o texto do livro em ${official.name}? O efeito automático dele passa a contar na ficha. O seu texto continua guardado.`)) return;
    onUpdate({ ...ability, extra: { ...(ability.extra || {}), sourceId: official.id, custom: false, fromCatalog: true } });
  };

  const effects = official && !custom ? official.effects : [];
  const subtitle = [official?.group ?? "Talento próprio", `nível ${ability.level || 1}`, choice].filter(Boolean).join(" · ");
  const autoLabel = official ? talentAutoLabel(official, choice) : "";
  const choiceOptions = official?.choice?.kind === "skill" ? SKILL_LIST.map(([name]) => name) : official?.choice?.kind === "list" ? official.choice.options : null;

  return (
    <div className={`ability-unit ability-card-shell talent-card ${official && !custom ? "is-official" : ""}`}>
      <div className="ability-card-row talent-row">
        <button type="button" className="ability-card-toggle" onClick={() => setMode(mode === "details" ? "compact" : "details")} aria-expanded={mode === "details"}>
          <strong>{ability.name || "Novo talento"}</strong>
          <small>{subtitle}</small>
        </button>
        <div className="ability-card-actions">
          <button type="button" className="ability-details-toggle" onClick={() => setMode(mode === "details" ? "compact" : "details")} aria-expanded={mode === "details"}>{mode === "details" ? "Fechar" : "Ver"}</button>
        </div>
      </div>
      {mode === "details" && (
        <div className="ability-detail-panel talent-detail">
          {official?.prereq && <p className="talent-prereq">Pré-requisito: {official.prereq.text}</p>}
          {official?.choice && !custom && (
            <label className="talent-choice">
              <span>{official.choice.label}</span>
              {choiceOptions ? (
                <select value={choice} onChange={(event) => setChoice(event.target.value)}>
                  <option value="">Escolher…</option>
                  {choiceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input value={choice} placeholder="Ex.: Lança" onChange={(event) => setChoice(event.target.value)} />
              )}
            </label>
          )}
          {effects.length > 0 ? (
            <ul className="talent-effects">{effects.map((effect) => <li key={effect}>{effect}</li>)}</ul>
          ) : (
            <p className="talent-text">{ability.description || "Sem descrição. Use Editar para escrever o que o talento faz."}</p>
          )}
          {autoLabel && !custom && <p className="talent-auto">{autoLabel}</p>}
          {ability.notes && <p className="talent-notes"><strong>Observações:</strong> {ability.notes}</p>}
          <div className="talent-detail-actions">
            <button type="button" className="ability-edit-link" onClick={editOwnVersion}>{linked ? "Escrever minha versão" : "Editar"}</button>
            {official && !linked && <button type="button" className="ability-edit-link" onClick={useBookText}>Usar texto do livro</button>}
            <button type="button" className="remove-action" onClick={remove}>Remover</button>
          </div>
        </div>
      )}
      {mode === "edit" && (
        <div className="ability-editor talent-editor" aria-label={`Editar ${ability.name || "talento"}`}>
          <label className="span-2">Nome<input value={ability.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Nível<input type="number" min={1} value={ability.level} onChange={(event) => update("level", Number(event.target.value))} /></label>
          <label className="span-full">O que o talento faz<textarea value={ability.description} onChange={(event) => update("description", event.target.value)} /></label>
          <label className="span-full">Observações<input value={ability.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label>
          <div className="ability-editor-actions">
            <button type="button" className="ability-save-link" onClick={() => setMode("details")}>Concluir edição</button>
            <button type="button" className="remove-action" onClick={remove}>Remover talento</button>
          </div>
        </div>
      )}
      <div className="ability-print print-only">
        <header className="ability-print-heading">
          <strong className="ability-print-name">{ability.name || "Talento sem nome"}</strong>
          <span>{subtitle}</span>
        </header>
        {effects.length > 0 ? <ul className="talent-effects">{effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : ability.description && <p>{ability.description}</p>}
        {ability.notes && <p><strong>Observações:</strong> {ability.notes}</p>}
      </div>
    </div>
  );
}
