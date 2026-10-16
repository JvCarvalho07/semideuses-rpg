import { useEffect, useState } from "react";
import { ABILITY_META, makeId, type Ability, type AbilityCategory, type CharacterSheet } from "../model";
import { type Derived } from "../rules";
import { ABILITY_SECTION_ASSETS } from "./config";
import { formatActivationLabel, formatCostLabel, formatCostValue } from "./format";
import { SignatureWorkspace } from "./signatures";

export function AbilityEditor({
  ability,
  onUpdate,
  onRemove,
  forceOpen,
}: {
  ability: Ability;
  onUpdate: (ability: Ability) => void;
  onRemove: () => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(!ability.name);
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);
  const update = (key: keyof Ability, value: string | number) => onUpdate({ ...ability, [key]: value });
  return (
    <div className="ability-unit">
      <details className="ability-card" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>
          <span className="ability-rank">{ability.rank || "—"}</span>
          <span>
            <strong>{ability.name || "Nova habilidade"}</strong>
            <small>Nível {ability.level || 1} · {ability.activation || "Ativação não definida"}</small>
          </span>
          <span className="ability-cost">{ability.cost || "Sem custo"}</span>
          <span className="disclosure">+</span>
        </summary>
        <div className="ability-editor">
          <label className="span-2">Nome<input value={ability.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Nível<input type="number" min={1} value={ability.level} onChange={(event) => update("level", Number(event.target.value))} /></label>
          <label>Rank<input value={ability.rank} onChange={(event) => update("rank", event.target.value)} /></label>
          <label>Custo<input value={ability.cost} onChange={(event) => update("cost", event.target.value)} /></label>
          <label>Ativação<input value={ability.activation} onChange={(event) => update("activation", event.target.value)} /></label>
          <label>Alcance<input value={ability.range} onChange={(event) => update("range", event.target.value)} /></label>
          <label>Duração<input value={ability.duration} onChange={(event) => update("duration", event.target.value)} /></label>
          <label>Recarga<input value={ability.recharge} onChange={(event) => update("recharge", event.target.value)} /></label>
          <label className="span-full">Descrição<textarea value={ability.description} onChange={(event) => update("description", event.target.value)} /></label>
          <button type="button" className="remove-action" onClick={onRemove}>Remover habilidade</button>
        </div>
      </details>
      <div className="ability-print print-only">
        <div className="print-meta">
          {ability.range && <span>Alcance {ability.range}</span>}
          {ability.duration && <span>Duração {ability.duration}</span>}
          {ability.recharge && <span>Recarga {ability.recharge}</span>}
        </div>
        {ability.description && <p>{ability.description}</p>}
      </div>
    </div>
  );
}

export function AbilityReadOnly({ ability }: { ability: Ability }) {
  const fields = [
    ["Nível", ability.level || 1],
    ["Rank", ability.rank || "—"],
    ["Custo", formatCostValue(ability.cost) || "—"],
    ["Ação", ability.activation || "Não definida"],
    ["Alcance", ability.range || "—"],
    ["Duração", ability.duration || "—"],
    ["Recarga", ability.recharge || "—"],
  ];
  return (
    <div className="ability-readonly" aria-label={`Detalhes de ${ability.name || "habilidade"}`}>
      <div className="ability-detail-grid">
        {fields.map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="ability-rules"><span>Descrição</span><p>{ability.description || "Nenhuma regra ou descrição registrada."}</p></div>
      {ability.notes && <div className="ability-rules"><span>Observações</span><p>{ability.notes}</p></div>}
    </div>
  );
}

export function AbilityCard({
  ability,
  category,
  onUpdate,
  onRemove,
  forceOpen,
}: {
  ability: Ability;
  category: AbilityCategory;
  onUpdate: (ability: Ability) => void;
  onRemove: () => void;
  forceOpen?: boolean;
}) {
  const [mode, setMode] = useState<"compact" | "details" | "edit">(!ability.name ? "edit" : "compact");
  useEffect(() => {
    if (forceOpen !== undefined) setMode(forceOpen ? "details" : "compact");
  }, [forceOpen]);
  const update = (key: keyof Ability, value: string | number) => onUpdate({ ...ability, [key]: value });
  const remove = () => {
    if (window.confirm(`Remover ${ability.name || "esta habilidade"}?`)) onRemove();
  };
  return (
    <div className="ability-unit ability-card-shell">
      <div className="ability-card-row">
        <span className="ability-rank">{ability.rank || "—"}</span>
        <button type="button" className="ability-card-toggle" onClick={() => setMode(mode === "details" ? "compact" : "details")} aria-expanded={mode === "details"}>
          <strong>{ability.name || "Nova habilidade"}</strong>
          <small>Nível {ability.level || 1} · {ability.activation || "Ativação não definida"}</small>
        </button>
        <span className="ability-cost">{formatCostValue(ability.cost) || "—"}</span>
        <div className="ability-card-actions">
          <button type="button" className="ability-details-toggle" onClick={() => setMode(mode === "details" ? "compact" : "details")} aria-expanded={mode === "details"}>{mode === "details" ? "Fechar" : "Ver detalhes"}</button>
          <button type="button" className="ability-edit-link" onClick={() => setMode("edit")}>Editar</button>
        </div>
      </div>
      {mode === "details" && (
        <div className="ability-detail-panel">
          <AbilityReadOnly ability={ability} />
          <button type="button" className="ability-edit-link" onClick={() => setMode("edit")}>Editar esta habilidade</button>
        </div>
      )}
      {mode === "edit" && (
        <div className="ability-editor" aria-label={`Editar ${ability.name || "habilidade"}`}>
          <label className="span-2">Nome<input value={ability.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Nível<input type="number" min={1} value={ability.level} onChange={(event) => update("level", Number(event.target.value))} /></label>
          <label>Rank<input value={ability.rank} onChange={(event) => update("rank", event.target.value)} /></label>
          <label>Custo<input value={ability.cost} onChange={(event) => update("cost", event.target.value)} /></label>
          <label>Ativação<input value={ability.activation} onChange={(event) => update("activation", event.target.value)} /></label>
          <label>Alcance<input value={ability.range} onChange={(event) => update("range", event.target.value)} /></label>
          <label>Duração<input value={ability.duration} onChange={(event) => update("duration", event.target.value)} /></label>
          <label>Recarga<input value={ability.recharge} onChange={(event) => update("recharge", event.target.value)} /></label>
          <label className="span-full">Descrição<textarea value={ability.description} onChange={(event) => update("description", event.target.value)} /></label>
          <div className="ability-editor-actions">
            <button type="button" className="ability-save-link" onClick={() => setMode("details")}>Concluir edição</button>
            <button type="button" className="remove-action" onClick={remove}>Remover habilidade</button>
          </div>
        </div>
      )}
      <div className="ability-print print-only">
        <header className="ability-print-heading">
          <strong className="ability-print-name">{ability.name || "Habilidade sem nome"}</strong>
          <span>{ABILITY_META[category].title} · Nível {ability.level || 1}{ability.rank ? ` · Rank ${ability.rank}` : ""}</span>
        </header>
        <div className="print-meta">
          {formatCostLabel(ability.cost) && <span>{formatCostLabel(ability.cost)}</span>}
          {formatActivationLabel(ability.activation) && <span>{formatActivationLabel(ability.activation)}</span>}
          {ability.range && <span>Alcance: {ability.range}</span>}
          {ability.duration && <span>Duração: {ability.duration}</span>}
          {ability.recharge && <span>Recarga: {ability.recharge}</span>}
        </div>
        {ability.description && <p>{ability.description}</p>}
        {ability.notes && <p><strong>Observações:</strong> {ability.notes}</p>}
      </div>
    </div>
  );
}

export function AbilitySection({
  category,
  items,
  onChange,
  search,
  actionFilter,
  categoryFilter,
  expandAll,
}: {
  category: AbilityCategory;
  items: Ability[];
  onChange: (items: Ability[]) => void;
  search: string;
  actionFilter: string;
  categoryFilter: string;
  expandAll: boolean | undefined;
}) {
  if (categoryFilter !== "Todas" && categoryFilter !== category) return null;
  const meta = ABILITY_META[category];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleItems = items.filter((item) => {
    const haystack = [item.name, item.rank, item.activation, item.cost, item.description, item.range, item.duration, item.recharge, item.notes].join(" ").toLocaleLowerCase();
    return (!normalizedSearch || haystack.includes(normalizedSearch)) && (!actionFilter || item.activation === actionFilter);
  });
  const add = () =>
    onChange([
      ...items,
      {
        id: makeId(category),
        name: "",
        level: 1,
        rank: "",
        cost: "",
        activation: "",
        range: "",
        duration: "",
        recharge: "",
        description: "",
      },
    ]);

  return (
    <section className={`ability-category category-${category}`}>
      <div className="category-heading">
        <div>
          <h3><img className="section-medallion" src={ABILITY_SECTION_ASSETS[category].src} width={30} height={30} loading="lazy" decoding="async" alt="" />{meta.title}</h3>
          <small>{meta.description}</small>
        </div>
        <span title={visibleItems.length === items.length ? undefined : `${visibleItems.length} visíveis de ${items.length}`}>{visibleItems.length === items.length ? items.length : `${visibleItems.length}/${items.length}`}</span>
        <button type="button" onClick={add}>Adicionar</button>
      </div>
      <div className="ability-list">
        {items.length === 0 && <p className="empty-state"><img src={ABILITY_SECTION_ASSETS[category].src} width={34} height={34} loading="lazy" decoding="async" alt="" />Vazio. Adicione a primeira entrada nesta categoria.</p>}
        {items.length > 0 && visibleItems.length === 0 && <p className="empty-state">Nenhuma entrada corresponde aos filtros atuais.</p>}
        {visibleItems.map((item) => (
          <AbilityCard
            key={item.id}
            ability={item}
            category={category}
            forceOpen={expandAll}
            onUpdate={(updated) => onChange(items.map((current) => current.id === item.id ? updated : current))}
            onRemove={() => onChange(items.filter((current) => current.id !== item.id))}
          />
        ))}
      </div>
    </section>
  );
}

export function AbilityLayout({
  sheet,
  compact,
  search,
  actionFilter,
  categoryFilter,
  expandAll,
  resource,
  onChange,
}: {
  sheet: CharacterSheet;
  resource: Derived["resource"];
  compact: boolean;
  search: string;
  actionFilter: string;
  categoryFilter: string;
  expandAll: boolean | undefined;
  onChange: (updater: (current: CharacterSheet) => CharacterSheet) => void;
}) {
  const section = (category: AbilityCategory) => (
    <AbilitySection
      key={category}
      category={category}
      items={sheet.abilityGroups[category]}
      search={search}
      actionFilter={actionFilter}
      categoryFilter={categoryFilter}
      expandAll={expandAll}
      onChange={(items) => onChange((current) => ({ ...current, abilityGroups: { ...current.abilityGroups, [category]: items } }))}
    />
  );
  // O recurso oficial vive na ficha (painel principal); aqui só é exibido, para nunca divergir dele.
  const signatureItems = (sheet.filiationSignatures[sheet.filiation] || []).map((item) => item.custom ? item : {
    ...item,
    resource: resource ? { name: resource.spec.name, current: sheet.divineResource, min: resource.min, max: resource.max, unit: resource.spec.unit } : undefined,
  });
  const signature = (
    <SignatureWorkspace
      key="signature"
      filiationName={sheet.filiation}
      items={signatureItems}
      onChange={(items) => onChange((current) => ({ ...current, filiationSignatures: { ...current.filiationSignatures, [sheet.filiation]: items } }))}
    />
  );

  return (
    <>
      <div className={`ability-categories ${compact ? "is-compact-flow" : "is-desktop-stacks"}`}>
        {compact ? (
          <div className="ability-flow">
            {signature}
            {section("path")}
            {section("skills")}
            {section("filiation")}
            {section("abilities")}
            {section("talents")}
          </div>
        ) : (
          <>
            <div className="ability-main-band">
              <div className="ability-column ability-column-left">{section("path")}{section("skills")}</div>
              <div className="ability-column ability-column-right">{signature}{section("filiation")}</div>
            </div>
            <div className="ability-lower-band"><div className="ability-column">{section("abilities")}</div><div className="ability-column">{section("talents")}</div></div>
          </>
        )}
      </div>
      <div className="ability-print-flow print-only">
        {signatureItems.length <= 1 ? (
          <div className="ability-print-first-group"><div className="ability-print-section-title">Habilidades</div>{signature}</div>
        ) : (
          <><div className="ability-print-section-title">Habilidades</div>{signature}</>
        )}
        {section("path")}
        {section("skills")}
        {section("filiation")}
        {section("abilities")}
        {section("talents")}
      </div>
    </>
  );
}
