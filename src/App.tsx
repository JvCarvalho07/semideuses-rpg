import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ABILITY_META,
  ATTRIBUTE_LABELS,
  FILIATIONS,
  INITIAL_SHEET,
  SKILLS,
  makeId,
  type Ability,
  type AbilityCategory,
  type AttributeKey,
  type CharacterSheet,
  type Equipment,
  type FiliationSignatureState,
} from "./model";
import {
  ensureFiliationSignatures,
  makeOfficialState,
  signatureDefinition,
} from "./filiationSignatures";
import { normalizeImportedSheet } from "./import";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const EQUIPMENT_TYPES = ["Arma", "Armadura", "Escudo", "Ferramenta", "Acessório", "Relíquia", "Consumível", "Outro"];
const RESOURCE_ASSETS = {
  health: `${import.meta.env.BASE_URL}assets/resource-vitality.webp`,
  mana: `${import.meta.env.BASE_URL}assets/resource-mana.webp`,
  divine: `${import.meta.env.BASE_URL}assets/resource-divine.webp`,
  texture: `${import.meta.env.BASE_URL}assets/resource-panel-texture.webp`,
} as const;
const ORIGIN_SUGGESTIONS = ["Semideus Grego", "Sátiro", "Ciclope", "Mortal Vidente", "Legado"];
type PrintFormat = "A4" | "A3" | "A5";
const LEGEND_CHOICES = [
  {
    value: "O Voto",
    title: "O Voto",
    description: "Sirva a um ideal eterno. O tempo deixa de tocar você, mas sua imortalidade passa a obedecer regras que não podem ser quebradas.",
  },
  {
    value: "Ascensão Menor",
    title: "Ascensão Menor",
    description: "Assuma um domínio órfão como espírito ou divindade menor. Você se torna imortal, mas deixa para trás a vida de herói mortal.",
  },
  {
    value: "Lenda Mortal",
    title: "Lenda Mortal",
    description: "Recuse a imortalidade. Sua vida continua finita, seus feitos permanecem e seu nome atravessa as gerações.",
  },
  {
    value: "Renascimento",
    title: "Renascimento",
    description: "Escolha viver novamente e buscar a Ilha dos Bem-Aventurados através de três vidas verdadeiramente heroicas.",
  },
] as const;

function modifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function normalizedLabel(value: string) {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

function formatCostValue(value: string | undefined, resourceName?: string) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const normalized = normalizedLabel(raw).replace(/[—–]/g, "-");
  if (normalized === "-" || normalized === "sem custo" || /^0(?:[.,]0)?$/.test(normalized)) return "Sem custo";
  if (resourceName && /^\d+(?:[.,]\d+)?$/.test(raw)) return `${raw} ${resourceName}`;
  return raw;
}

function formatCostLabel(value: string | undefined, resourceName?: string) {
  const formatted = formatCostValue(value, resourceName);
  if (!formatted) return "";
  return formatted === "Sem custo" ? formatted : `Custo: ${formatted}`;
}

function formatActivationLabel(value: string | undefined) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const normalized = normalizedLabel(raw);
  return normalized.includes("conforme descricao") || normalized.includes("passiva") || normalized.includes("sempre")
    ? `Ativação: ${raw}`
    : `Ação: ${raw}`;
}

function proficiency(level: number) {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

function initialPrintFormat(): PrintFormat {
  const queryFormat = new URLSearchParams(window.location.search).get("paper");
  if (queryFormat === "A3" || queryFormat === "A4" || queryFormat === "A5") return queryFormat;
  const storedFormat = localStorage.getItem("semideuses-print-format");
  return storedFormat === "A3" || storedFormat === "A5" ? storedFormat : "A4";
}

function NumberControl({
  label,
  value,
  max,
  iconSrc,
  onChange,
  onIncrease,
  onDecrease,
  onMaxChange,
}: {
  label: string;
  value: number;
  max: number;
  iconSrc?: string;
  onChange: (value: number) => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onMaxChange?: (value: number) => void;
}) {
  const increase = onIncrease || (() => onChange(Math.min(Math.max(0, max), Math.max(0, value + 1))));
  const decrease = onDecrease || (() => onChange(Math.max(0, value - 1)));
  return (
    <div className="number-control">
      <span className="number-label">
        {iconSrc && <img className="resource-medallion" src={iconSrc} width={28} height={28} loading="lazy" decoding="async" alt="" />}
        <span>{label}</span>
      </span>
      <button type="button" onClick={decrease} aria-label={`Reduzir ${label}`}>−</button>
      <strong>{value}</strong>
      <small>/</small>
      {onMaxChange ? (
        <>
          <input
          className="number-max"
          type="number"
          min={0}
          value={Math.max(0, max)}
          aria-label={`Máximo ${label}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onMaxChange(Math.max(0, Number(event.target.value)))}
          />
          <span className="number-max-print print-only">{Math.max(0, max)}</span>
        </>
      ) : <small>{max}</small>}
      <button type="button" onClick={increase} aria-label={`Aumentar ${label}`}>+</button>
    </div>
  );
}

function ResourceBar({
  value,
  max,
  color,
  temp,
  label,
  onChange,
  kind,
}: {
  value: number;
  max: number;
  color: string;
  temp?: number;
  label?: string;
  onChange?: (value: number) => void;
  kind?: "health" | "mana" | "divine";
}) {
  const safeMax = Math.max(0, max);
  const safeValue = Math.min(Math.max(0, value), safeMax);
  const percent = safeMax > 0 ? Math.min(100, (safeValue / safeMax) * 100) : 0;
  const tempPercent = safeMax > 0 ? Math.min(100, (Math.max(0, temp || 0) / safeMax) * 100) : 0;
  return (
    <div className={`bar-group ${onChange ? "is-adjustable" : ""}`}>
      <div className={`meter meter-${kind || "resource"}`}>
        <span style={{ width: `${percent}%`, background: color }} />
        {onChange && (
          <input
            type="range"
            min={0}
            max={safeMax}
            value={safeValue}
            aria-label={`Ajustar ${label || "recurso"}`}
            onInput={(event) => onChange(Math.min(safeMax, Math.max(0, Number(event.currentTarget.value))))}
          />
        )}
      </div>
      {temp !== undefined && (
        <div className="temp-meter">
          <span className="temp-label">PV temporário</span>
          <div><i style={{ width: `${tempPercent}%` }} /></div>
          <b>+{temp}</b>
        </div>
      )}
    </div>
  );
}

function prepareAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 10 MB."));
      return;
    }

    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(source);
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(source);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    image.src = source;
  });
}

function AbilityEditor({
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

function AbilityReadOnly({ ability }: { ability: Ability }) {
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

function AbilityCard({
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

function AbilitySection({
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
          <h3>{meta.title}</h3>
        </div>
        <span title={visibleItems.length === items.length ? undefined : `${visibleItems.length} visíveis de ${items.length}`}>{visibleItems.length === items.length ? items.length : `${visibleItems.length}/${items.length}`}</span>
        <button type="button" onClick={add}>Adicionar</button>
      </div>
      <div className="ability-list">
        {items.length === 0 && <p className="empty-state">Vazio. Adicione a primeira entrada nesta categoria.</p>}
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

function FiliationSignatureSection({
  filiationName,
  items,
  onChange,
  onResourceChange,
}: {
  filiationName: string;
  items: FiliationSignatureState[];
  onChange: (items: FiliationSignatureState[]) => void;
  onResourceChange?: (value: number) => void;
}) {
  const updateItem = (id: string, updated: FiliationSignatureState) => {
    onChange(items.map((item) => item.id === id ? updated : item));
  };
  const addCustom = () => {
    const id = makeId("signature");
    onChange([
      ...items,
      {
        id,
        sourceId: id,
        title: "",
        rules: "",
        selectedOptions: {},
        notes: "",
        custom: true,
      },
    ]);
  };

  return (
    <section className="filiation-signature-section ability-category">
      <div className="category-heading">
        <div>
          <h3>Assinatura da filiação</h3>
        </div>
        <span>{items.length}</span>
        <button type="button" onClick={addCustom} disabled={!filiationName}>Personalizar</button>
      </div>
      <div className="signature-list">
        {!filiationName && <p className="empty-state">Escolha uma filiação para revelar sua assinatura.</p>}
        {filiationName && items.length === 0 && <p className="empty-state">Nenhuma assinatura registrada.</p>}
        {items.map((item) => {
          const definition = signatureDefinition(item);
          const choices = definition?.choices || [];
          const resource = item.resource;
          const moves = item.moves || [];
          const officialRules = item.officialSnapshot?.rules || item.rules;
          const restoreOfficial = () => {
            if (!definition) return;
            const official = makeOfficialState(definition, filiationName);
            updateItem(item.id, { ...official, id: item.id });
          };
          return (
            <article className={`signature-card ${item.custom ? "is-custom" : "is-official"}`} key={item.id}>
              <details className="signature-disclosure" open={item.custom || undefined}>
                <summary className="signature-summary">
                  <span aria-hidden="true">{item.custom ? "+" : "Σ"}</span>
                  <span><strong>{item.title || "Assinatura sem nome"}</strong><small>{item.custom ? "Personalizada" : filiationName}{resource ? ` · ${resource.name} ${resource.current}/${resource.max}` : ""}</small></span>
                  <span className="signature-summary-meta">{moves.length} {moves.length === 1 ? "efeito" : "efeitos"}</span>
                  <span className="disclosure">+</span>
                </summary>
                <div className="signature-screen">
                  <div className="signature-structured-grid">
                    <label>Nome<input value={item.title} onChange={(event) => updateItem(item.id, { ...item, title: event.target.value })} /></label>
                    <label className="span-full">Resumo<textarea value={item.summary || item.rules} onChange={(event) => updateItem(item.id, { ...item, summary: event.target.value, rules: event.target.value })} /></label>
                    {resource && (
                      <fieldset className="signature-resource span-full">
                        <legend>Recurso ou medidor</legend>
                        <label>Nome<input value={resource.name} onChange={(event) => updateItem(item.id, { ...item, resource: { ...resource, name: event.target.value } })} /></label>
                        <label>Atual<input type="number" min={0} value={resource.current} onChange={(event) => { const current = Math.max(0, Number(event.target.value)); updateItem(item.id, { ...item, resource: { ...resource, current } }); onResourceChange?.(current); }} /></label>
                        <label>Máximo<input type="number" min={0} value={resource.max} onChange={(event) => updateItem(item.id, { ...item, resource: { ...resource, max: Math.max(0, Number(event.target.value)) } })} /></label>
                        <label>Unidade<input value={resource.unit} onChange={(event) => updateItem(item.id, { ...item, resource: { ...resource, unit: event.target.value } })} /></label>
                      </fieldset>
                    )}
                    <label>Ganho e recuperação<textarea value={item.recovery || ""} placeholder="Gatilhos, descanso e recuperação" onChange={(event) => updateItem(item.id, { ...item, recovery: event.target.value })} /></label>
                    <label>Custos e consumos<textarea value={item.costs || ""} placeholder="Custos, limites e consumos" onChange={(event) => updateItem(item.id, { ...item, costs: event.target.value })} /></label>
                  </div>

                  <div className="signature-moves">
                    <div className="signature-subheading"><strong>Efeitos e manobras</strong><button type="button" onClick={() => updateItem(item.id, { ...item, moves: [...moves, { id: makeId("signature-move"), name: "", cost: "", activation: "", description: "" }] })}>Adicionar linha</button></div>
                    {moves.length === 0 && <p className="empty-state">Nenhuma linha estruturada. Adicione uma manobra ou mantenha a referência oficial abaixo.</p>}
                    {moves.map((move, moveIndex) => (
                      <div className="signature-move-row" key={move.id}>
                        <label>Nome<input value={move.name} onChange={(event) => updateItem(item.id, { ...item, moves: moves.map((current) => current.id === move.id ? { ...current, name: event.target.value } : current) })} /></label>
                        <label>Custo<input value={move.cost} onChange={(event) => updateItem(item.id, { ...item, moves: moves.map((current) => current.id === move.id ? { ...current, cost: event.target.value } : current) })} /></label>
                        <label>Ação<input value={move.activation} onChange={(event) => updateItem(item.id, { ...item, moves: moves.map((current) => current.id === move.id ? { ...current, activation: event.target.value } : current) })} /></label>
                        <label className="span-2">Descrição<textarea value={move.description} onChange={(event) => updateItem(item.id, { ...item, moves: moves.map((current) => current.id === move.id ? { ...current, description: event.target.value } : current) })} /></label>
                        <div className="signature-move-actions">
                          <button type="button" onClick={() => updateItem(item.id, { ...item, moves: moveIndex === 0 ? moves : moves.map((current, index) => index === moveIndex - 1 ? moves[moveIndex] : index === moveIndex ? moves[moveIndex - 1] : current) })} disabled={moveIndex === 0} aria-label="Mover linha para cima">↑</button>
                          <button type="button" onClick={() => updateItem(item.id, { ...item, moves: moveIndex === moves.length - 1 ? moves : moves.map((current, index) => index === moveIndex ? moves[moveIndex + 1] : index === moveIndex + 1 ? moves[moveIndex] : current) })} disabled={moveIndex === moves.length - 1} aria-label="Mover linha para baixo">↓</button>
                          <button type="button" className="remove-action" onClick={() => updateItem(item.id, { ...item, moves: moves.filter((current) => current.id !== move.id) })}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {choices.length > 0 && (
                    <div className="signature-choices">
                      {choices.map((choice) => (
                        <label key={choice.id}><span>{choice.label}</span><select value={item.selectedOptions[choice.id] || choice.defaultValue} onChange={(event) => updateItem(item.id, { ...item, selectedOptions: { ...item.selectedOptions, [choice.id]: event.target.value } })}>{choice.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                      ))}
                    </div>
                  )}
                  <details className="signature-reference"><summary>Referência oficial · página {item.officialSnapshot?.pdfPage || definition?.source.pdfPage || "—"}</summary><p>{officialRules || "Nenhuma referência oficial registrada."}</p></details>
                  <label className="signature-notes"><span>Observações da ficha</span><textarea value={item.notes} placeholder="Uso atual, alvos, cargas ou lembretes" onChange={(event) => updateItem(item.id, { ...item, notes: event.target.value })} /></label>
                  <div className="signature-footer-actions">
                    <button type="button" className="signature-restore" onClick={restoreOfficial} disabled={!definition}>Restaurar oficial</button>
                    {item.custom && <button type="button" className="remove-action" onClick={() => onChange(items.filter((current) => current.id !== item.id))}>Remover assinatura</button>}
                  </div>
                </div>
              </details>
              <div className="signature-print print-only">
                <header><strong>{item.title || "Assinatura personalizada"}</strong><span>{item.custom ? "Personalizada" : filiationName}</span></header>
                {item.officialSnapshot?.rules && <p><strong>Referência oficial:</strong> {item.officialSnapshot.rules}</p>}
                {item.summary && <p><strong>Resumo:</strong> {item.summary}</p>}
                {item.resource && <dl><div><dt>Recurso</dt><dd>{item.resource.name} {item.resource.current}/{item.resource.max} {item.resource.unit}</dd></div></dl>}
                {item.recovery && <p><strong>Ganho e recuperação:</strong> {item.recovery}</p>}
                {item.costs && <p><strong>Custos:</strong> {item.costs}</p>}
                {item.moves?.length ? <dl>{item.moves.map((move) => <div key={move.id}><dt>{move.name}</dt><dd>{[formatCostLabel(move.cost, resource?.name), formatActivationLabel(move.activation), move.description].filter(Boolean).join(" · ")}</dd></div>)}</dl> : null}
                {choices.length > 0 && (
                  <dl>
                    {choices.map((choice) => {
                      const selected = item.selectedOptions[choice.id] || choice.defaultValue;
                      const label = choice.options.find((option) => option.value === selected)?.label || selected;
                      return <div key={choice.id}><dt>{choice.label}</dt><dd>{label}</dd></div>;
                    })}
                  </dl>
                )}
                {item.notes && <p className="signature-print-notes"><strong>Notas:</strong> {item.notes}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SignatureReadOnly({
  item,
  filiationName,
  onEdit,
  onRemove,
}: {
  item: FiliationSignatureState;
  filiationName: string;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const definition = signatureDefinition(item);
  const choices = definition?.choices || [];
  const resource = item.resource;
  const moves = item.moves || [];
  const officialRules = item.officialSnapshot?.rules || item.rules;
  const resourceMax = Math.max(0, resource?.max || 0);
  const resourceCurrent = Math.min(resourceMax, Math.max(0, resource?.current || 0));
  return (
    <div className="signature-readonly">
      <header className="signature-readonly-head">
        <div>
          <span className="signature-kicker">{item.custom ? "Registro personalizado" : filiationName}</span>
          <h4>{item.title || "Assinatura sem nome"}</h4>
          <p>{item.summary || item.rules || "Nenhum resumo registrado. Abra Editar assinatura para preencher."}</p>
        </div>
        <div className="signature-readonly-actions">
          <button type="button" className="ability-edit-link" onClick={onEdit}>Editar assinatura</button>
          {onRemove && <button type="button" className="remove-action" onClick={onRemove}>Remover</button>}
        </div>
      </header>
      {resource && (
        <div className="signature-resource-readonly">
          <div><span>{resource.name || "Recurso"}</span><strong>{resourceCurrent}/{resourceMax} <small>{resource.unit}</small></strong></div>
          <div className="signature-resource-meter" role="progressbar" aria-valuemin={0} aria-valuemax={resourceMax} aria-valuenow={resourceCurrent}><i style={{ width: `${resourceMax ? (resourceCurrent / resourceMax) * 100 : 0}%` }} /></div>
        </div>
      )}
      <div className="signature-detail-grid">
        {item.recovery && <div><span>Ganho e recuperação</span><p>{item.recovery}</p></div>}
        {item.costs && <div><span>Custos e consumos</span><p>{item.costs}</p></div>}
      </div>
      <section className="signature-effects-readonly">
        <div className="signature-subheading"><strong>Efeitos e manobras</strong><span>{moves.length}</span></div>
        {moves.length ? moves.map((move) => (
          <article key={move.id}>
            <div><strong>{move.name || "Efeito sem nome"}</strong><span>{[formatCostLabel(move.cost, resource?.name), formatActivationLabel(move.activation)].filter(Boolean).join(" · ")}</span></div>
            <p>{move.description || "Sem descrição."}</p>
          </article>
        )) : <p className="empty-state">Nenhum efeito estruturado. A referência oficial continua disponível abaixo.</p>}
      </section>
      {choices.length > 0 && (
        <section className="signature-choices-readonly"><span>Escolhas</span>{choices.map((choice) => {
          const selected = item.selectedOptions[choice.id] || choice.defaultValue;
          const label = choice.options.find((option) => option.value === selected)?.label || selected;
          return <div key={choice.id}><strong>{choice.label}</strong><p>{label}</p></div>;
        })}</section>
      )}
      <details className="signature-reference-readonly"><summary>Referência oficial · página {item.officialSnapshot?.pdfPage || definition?.source.pdfPage || "—"}</summary><p>{officialRules || "Nenhuma referência oficial registrada."}</p></details>
      {item.notes && <div className="signature-notes-readonly"><span>Observações da ficha</span><p>{item.notes}</p></div>}
    </div>
  );
}

function SignatureEditor({
  item,
  filiationName,
  onSave,
  onCancel,
  onRestore,
}: {
  item: FiliationSignatureState;
  filiationName: string;
  onSave: (item: FiliationSignatureState) => void;
  onCancel: () => void;
  onRestore: (item: FiliationSignatureState) => FiliationSignatureState;
}) {
  const [draft, setDraft] = useState<FiliationSignatureState>(() => ({ ...item, selectedOptions: { ...item.selectedOptions }, moves: item.moves?.map((move) => ({ ...move })), resource: item.resource ? { ...item.resource } : undefined }));
  const definition = signatureDefinition(draft);
  const choices = definition?.choices || [];
  const moves = draft.moves || [];
  const update = (changes: Partial<FiliationSignatureState>) => setDraft((current) => ({ ...current, ...changes }));
  const updateMove = (id: string, changes: Partial<NonNullable<FiliationSignatureState["moves"]>[number]>) => update({ moves: moves.map((move) => move.id === id ? { ...move, ...changes } : move) });
  const swapMove = (index: number, next: number) => {
    if (next < 0 || next >= moves.length) return;
    const reordered = [...moves];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    update({ moves: reordered });
  };
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onCancel]);
  return createPortal((
    <div className="signature-editor-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="signature-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="signature-editor-title">
        <header className="signature-editor-header">
          <div><span>Editor da assinatura</span><h3 id="signature-editor-title">{draft.title || "Nova assinatura"}</h3><small>{filiationName || "Filiação não definida"}</small></div>
          <div className="signature-editor-actions"><button type="button" onClick={onCancel}>Cancelar</button><button type="button" className="primary-action" onClick={() => onSave(draft)}>Salvar alterações</button></div>
        </header>
        <div className="signature-editor-body">
          <div className="signature-structured-grid">
            <label>Nome<input value={draft.title} onChange={(event) => update({ title: event.target.value })} /></label>
            <label className="span-full">Resumo<textarea value={draft.summary || draft.rules} onChange={(event) => update({ summary: event.target.value, rules: event.target.value })} /></label>
            <label>Ganho e recuperação<textarea value={draft.recovery || ""} placeholder="Gatilhos, descanso e recuperação" onChange={(event) => update({ recovery: event.target.value })} /></label>
            <label>Custos e consumos<textarea value={draft.costs || ""} placeholder="Custos, limites e consumos" onChange={(event) => update({ costs: event.target.value })} /></label>
          </div>
          <fieldset className="signature-resource-editor">
            <legend>Recurso ou medidor</legend>
            {!draft.resource && <button type="button" className="secondary-action" onClick={() => update({ resource: { name: "Recurso", current: 0, max: 0, unit: "cargas" } })}>Adicionar medidor</button>}
            {draft.resource && <div className="signature-resource"><label>Nome<input value={draft.resource.name} onChange={(event) => update({ resource: { ...draft.resource!, name: event.target.value } })} /></label><label>Atual<input type="number" min={0} value={draft.resource.current} onChange={(event) => update({ resource: { ...draft.resource!, current: Math.max(0, Number(event.target.value)) } })} /></label><label>Máximo<input type="number" min={0} value={draft.resource.max} onChange={(event) => { const max = Math.max(0, Number(event.target.value)); update({ resource: { ...draft.resource!, max, current: Math.min(max, Math.max(0, draft.resource!.current)) } }); }} /></label><label>Unidade<input value={draft.resource.unit} onChange={(event) => update({ resource: { ...draft.resource!, unit: event.target.value } })} /></label><button type="button" className="remove-action" onClick={() => update({ resource: undefined })}>Remover medidor</button></div>}
          </fieldset>
          <section className="signature-moves signature-editor-moves">
            <div className="signature-subheading"><div><strong>Efeitos e manobras</strong><small>Linhas independentes, mostradas de forma compacta na ficha.</small></div><button type="button" className="secondary-action" onClick={() => update({ moves: [...moves, { id: makeId("signature-move"), name: "", cost: "", activation: "", description: "" }] })}>Adicionar linha</button></div>
            {moves.map((move, index) => <div className="signature-move-row" key={move.id}><label>Nome<input value={move.name} onChange={(event) => updateMove(move.id, { name: event.target.value })} /></label><label>Custo<input value={move.cost} onChange={(event) => updateMove(move.id, { cost: event.target.value })} /></label><label>Ação<input value={move.activation} onChange={(event) => updateMove(move.id, { activation: event.target.value })} /></label><label className="span-2">Descrição<textarea value={move.description} onChange={(event) => updateMove(move.id, { description: event.target.value })} /></label><div className="signature-move-actions"><button type="button" onClick={() => swapMove(index, index - 1)} disabled={index === 0} aria-label="Mover linha para cima">↑</button><button type="button" onClick={() => swapMove(index, index + 1)} disabled={index === moves.length - 1} aria-label="Mover linha para baixo">↓</button><button type="button" className="remove-action" onClick={() => update({ moves: moves.filter((current) => current.id !== move.id) })}>Remover</button></div></div>)}
            {!moves.length && <p className="empty-state">Nenhuma linha personalizada. A referência oficial não será perdida.</p>}
          </section>
          {choices.length > 0 && <div className="signature-choices">{choices.map((choice) => <label key={choice.id}><span>{choice.label}</span><select value={draft.selectedOptions[choice.id] || choice.defaultValue} onChange={(event) => update({ selectedOptions: { ...draft.selectedOptions, [choice.id]: event.target.value } })}>{choice.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div>}
          <details className="signature-reference"><summary>Referência oficial · página {draft.officialSnapshot?.pdfPage || definition?.source.pdfPage || "—"}</summary><p>{draft.officialSnapshot?.rules || draft.rules || "Nenhuma referência oficial registrada."}</p></details>
          <label className="signature-notes"><span>Observações da ficha</span><textarea value={draft.notes} placeholder="Uso atual, alvos, cargas ou lembretes" onChange={(event) => update({ notes: event.target.value })} /></label>
          <div className="signature-editor-footer"><button type="button" className="signature-restore" onClick={() => setDraft(onRestore(draft))} disabled={!definition}>Restaurar oficial</button><span>O snapshot oficial permanece salvo no JSON.</span></div>
        </div>
      </section>
    </div>
  ), document.body);
}

function SignatureCard({
  item,
  filiationName,
  onEdit,
  onRemove,
}: {
  item: FiliationSignatureState;
  filiationName: string;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(item.custom));
  const definition = signatureDefinition(item);
  const resource = item.resource;
  const moves = item.moves || [];
  const panelId = `signature-details-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <article className={`signature-card ${item.custom ? "is-custom" : "is-official"}`}>
      <details className="signature-disclosure" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary
          className="signature-summary"
          aria-controls={panelId}
          aria-expanded={open}
          aria-label={open ? "Fechar detalhes da assinatura" : "Ver detalhes da assinatura"}
        >
          <span aria-hidden="true">{item.custom ? "✦" : "Σ"}</span>
          <span><strong>{item.title || "Assinatura sem nome"}</strong><small>{item.custom ? "Personalizada" : filiationName}{resource ? ` · ${resource.name} ${resource.current}/${resource.max}` : ""}</small></span>
          <span className="signature-summary-meta">{moves.length} {moves.length === 1 ? "efeito" : "efeitos"}</span>
          <span className="disclosure-label" data-open={open}>{open ? "Fechar detalhes" : "Ver detalhes"}</span>
        </summary>
        <div id={panelId}>
          <SignatureReadOnly item={item} filiationName={filiationName} onEdit={onEdit} onRemove={onRemove} />
        </div>
      </details>
      <div className="signature-print print-only">
        <header><strong>{item.title || "Assinatura personalizada"}</strong><span>{item.custom ? "Personalizada" : filiationName}</span></header>
        {item.officialSnapshot?.rules && <p><strong>Referência oficial:</strong> {item.officialSnapshot.rules}</p>}
        {item.summary && <p><strong>Resumo:</strong> {item.summary}</p>}
        {resource && <dl><div><dt>Recurso</dt><dd>{resource.name} {resource.current}/{resource.max} {resource.unit}</dd></div></dl>}
        {item.recovery && <p><strong>Ganho e recuperação:</strong> {item.recovery}</p>}
        {item.costs && <p><strong>Custos:</strong> {item.costs}</p>}
        {moves.length ? <dl>{moves.map((move) => <div key={move.id}><dt>{move.name}</dt><dd>{[formatCostLabel(move.cost, resource?.name), formatActivationLabel(move.activation), move.description].filter(Boolean).join(" · ")}</dd></div>)}</dl> : null}
        {definition?.choices?.length ? <dl>{definition.choices.map((choice) => { const selected = item.selectedOptions[choice.id] || choice.defaultValue; return <div key={choice.id}><dt>{choice.label}</dt><dd>{choice.options.find((option) => option.value === selected)?.label || selected}</dd></div>; })}</dl> : null}
        {item.notes && <p><strong>Notas:</strong> {item.notes}</p>}
      </div>
    </article>
  );
}

function SignatureWorkspace({
  filiationName,
  items,
  onChange,
  onResourceChange,
}: {
  filiationName: string;
  items: FiliationSignatureState[];
  onChange: (items: FiliationSignatureState[]) => void;
  onResourceChange?: (value: number) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingId);
  const updateItem = (id: string, updated: FiliationSignatureState) => onChange(items.map((item) => item.id === id ? updated : item));
  const addCustom = () => {
    const id = makeId("signature");
    const item: FiliationSignatureState = { id, sourceId: id, title: "", rules: "", selectedOptions: {}, notes: "", custom: true, summary: "", moves: [] };
    onChange([...items, item]);
    setEditingId(id);
  };
  const save = (updated: FiliationSignatureState) => {
    updateItem(updated.id, updated);
    if (updated.resource) onResourceChange?.(Math.min(Math.max(0, updated.resource.current), Math.max(0, updated.resource.max)));
    setEditingId(null);
  };
  const restore = (item: FiliationSignatureState) => {
    const definition = signatureDefinition(item);
    return definition ? { ...makeOfficialState(definition, filiationName), id: item.id } : item;
  };
  return (
    <section className="filiation-signature-section ability-category">
      <div className="category-heading"><div><h3>Assinatura da filiação</h3><small>Regras centrais e recurso próprio da divindade.</small></div><span>{items.length}</span><button type="button" onClick={addCustom} disabled={!filiationName}>Adicionar assinatura</button></div>
      <div className="signature-list">
        {!filiationName && <p className="empty-state">Escolha uma filiação para revelar sua assinatura.</p>}
        {filiationName && !items.length && <p className="empty-state">Nenhuma assinatura registrada.</p>}
        {items.map((item) => <SignatureCard
          key={item.id}
          item={item}
          filiationName={filiationName}
          onEdit={() => setEditingId(item.id)}
          onRemove={item.custom ? () => { if (window.confirm("Remover esta assinatura personalizada?")) onChange(items.filter((current) => current.id !== item.id)); } : undefined}
        />)}
      </div>
      {editingItem && <SignatureEditor item={editingItem} filiationName={filiationName} onSave={save} onCancel={() => setEditingId(null)} onRestore={restore} />}
    </section>
  );
}

function CoinIcon() {
  return <svg className="coin-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.7" /><path d="M8.4 9.2h6.8M8.4 12h6.8M8.4 14.8h6.8M10 6.8v10.4M14 6.8v10.4" /></svg>;
}

function EquipmentEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: Equipment;
  onUpdate: (item: Equipment) => void;
  onRemove: () => void;
}) {
  const update = <K extends keyof Equipment>(key: K, value: Equipment[K]) => onUpdate({ ...item, [key]: value });
  return (
    <details className={`equipment-item ${item.equipped ? "is-equipped" : ""}`}>
      <summary>
        <span className="equipment-symbol">{(item.type || "Outro").slice(0, 2).toUpperCase()}</span>
        <span><strong>{item.name || "Novo equipamento"}</strong><small>{item.type} · quantidade {item.quantity}</small></span>
        {item.equipped && <b>Equipado</b>}
        <span className="disclosure">+</span>
      </summary>
      <div className="equipment-editor">
        <label className="span-2">Nome<input value={item.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Tipo<select value={item.type} onChange={(event) => update("type", event.target.value)}>{EQUIPMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Quantidade<input type="number" min={0} value={item.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></label>
        <label className="check-field"><input type="checkbox" checked={item.equipped} onChange={(event) => update("equipped", event.target.checked)} /> Equipado</label>
        <label>CA / bônus<input type="number" value={item.armorClass} onChange={(event) => update("armorClass", Number(event.target.value))} /></label>
        <label>Ataque<input value={item.attack} onChange={(event) => update("attack", event.target.value)} /></label>
        <label>Dano<input value={item.damage} onChange={(event) => update("damage", event.target.value)} /></label>
        <label className="span-2">Propriedades<input value={item.properties} onChange={(event) => update("properties", event.target.value)} /></label>
        <label className="span-full">Notas<textarea value={item.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        <button type="button" className="remove-action" onClick={onRemove}>Remover equipamento</button>
      </div>
    </details>
  );
}

function AbilityLayout({
  sheet,
  compact,
  search,
  actionFilter,
  categoryFilter,
  expandAll,
  onChange,
}: {
  sheet: CharacterSheet;
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
  const signature = (
    <SignatureWorkspace
      key="signature"
      filiationName={sheet.filiation}
      items={sheet.filiationSignatures[sheet.filiation] || []}
      onResourceChange={(value) => onChange((current) => ({ ...current, divineResource: value }))}
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
        {signature}
        {section("path")}
        {section("skills")}
        {section("filiation")}
        {section("abilities")}
        {section("talents")}
      </div>
    </>
  );
}

function normalizeSheet(candidate: unknown): CharacterSheet {
  return normalizeImportedSheet(candidate).sheet;
}

export default function Home() {
  const [sheet, setSheet] = useState<CharacterSheet>(() => ({ ...INITIAL_SHEET }));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importNotice, setImportNotice] = useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");
  const [equipmentMode, setEquipmentMode] = useState<"Todos" | "Equipados" | "Inventário">("Todos");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilityCategoryFilter, setAbilityCategoryFilter] = useState("Todas");
  const [abilityActionFilter, setAbilityActionFilter] = useState("");
  const [abilityExpandAll, setAbilityExpandAll] = useState<boolean | undefined>(undefined);
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia("(max-width: 800px)").matches);
  const [legendOpen, setLegendOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>(initialPrintFormat);
  const importRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const updateViewport = () => setCompactViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.from(".app-nav", { opacity: 0, y: -12, duration: 0.8, ease: "power2.out" });
    gsap.from(".hero-shell", { opacity: 0, y: 22, scale: 0.992, duration: 1.05, ease: "power3.out" });
    gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
      gsap.from(section, {
        opacity: 0,
        y: 26,
        scale: 0.994,
        duration: 0.95,
        ease: "power2.out",
        scrollTrigger: { trigger: section, start: "top 90%", once: true },
      });
    });

    gsap.from(".ability-category", {
      opacity: 0,
      y: 18,
      stagger: 0.08,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: ".ability-categories", start: "top 86%", once: true },
    });
  }, { scope: rootRef });

  useEffect(() => {
    const stored = localStorage.getItem("semideuses-sheet-v3");
    if (!stored) {
      setHydrated(true);
      return;
    }
    try {
      const result = normalizeImportedSheet(JSON.parse(stored));
      if (result.recognized) setSheet(result.sheet);
    } catch {
      localStorage.removeItem("semideuses-sheet-v3");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("semideuses-sheet-v3", JSON.stringify(sheet));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1000);
    return () => window.clearTimeout(timer);
  }, [hydrated, sheet]);

  useEffect(() => {
    document.documentElement.dataset.printSize = printFormat;
    localStorage.setItem("semideuses-print-format", printFormat);

    const pageStyleId = "semideuses-print-page-style";
    let pageStyle = document.getElementById(pageStyleId) as HTMLStyleElement | null;
    if (!pageStyle) {
      pageStyle = document.createElement("style");
      pageStyle.id = pageStyleId;
      document.head.appendChild(pageStyle);
    }
    const margins = printFormat === "A3"
      ? "12mm 14mm 15mm"
      : printFormat === "A5"
        ? "6mm 7mm 8mm"
        : "9mm 10mm 11mm";
    pageStyle.textContent = `@media print { @page { size: ${printFormat} portrait; margin: ${margins}; } }`;

    return () => pageStyle?.remove();
  }, [printFormat]);

  useEffect(() => {
    if (!legendOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLegendOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeline = gsap.timeline();
      timeline
        .fromTo(".legend-overlay", { opacity: 0 }, { opacity: 1, duration: 0.28, ease: "power2.out" })
        .fromTo(".legend-dialog-panel", { opacity: 0, y: 20, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }, 0.04)
        .fromTo(".legend-choice", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.38, stagger: 0.055, ease: "power2.out" }, 0.17);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [legendOpen]);

  const filiation = FILIATIONS[sheet.filiation as keyof typeof FILIATIONS] || {
    resource: "Recurso da filiação",
    max: 10,
    accent: "#b9863f",
    light: "#e8ca8c",
    deep: "#172d32",
    secondary: "#0e6172",
    mark: "Σ",
  };
  const prof = proficiency(sheet.level);
  const mods = useMemo(
    () => Object.fromEntries(Object.entries(sheet.attributes).map(([key, score]) => [key, modifier(score)])) as Record<AttributeKey, number>,
    [sheet.attributes],
  );
  const equippedArmor = sheet.equipment.filter((item) => item.equipped && item.type === "Armadura");
  const armorBase = equippedArmor.length ? Math.max(...equippedArmor.map((item) => item.armorClass)) : 10 + mods.des;
  const equipmentBonus = sheet.equipment
    .filter((item) => item.equipped && item.type !== "Armadura")
    .reduce((sum, item) => sum + item.armorClass, 0);
  const automaticArmorClass = armorBase + equipmentBonus + sheet.caExtra;
  const armorClass = sheet.caOverride ?? automaticArmorClass;
  const passivePerception = 10 + mods.sab + prof * (sheet.skillRanks.Percepção || 0);
  const perception = sheet.perceptionOverride ?? passivePerception;
  const automaticInitiative = mods.des + sheet.initiativeExtra;
  const initiative = sheet.initiativeOverride ?? automaticInitiative;
  const automaticSpeed = sheet.speed;
  const speed = sheet.speedOverride ?? automaticSpeed;
  const castingModifier = mods[sheet.castingAttribute];
  const castingAttackBonus = castingModifier + prof;
  const automaticCastingDc = 8 + castingModifier + prof;
  const castingDc = sheet.castingDcOverride ?? automaticCastingDc;

  const rootStyle = {
    "--deity": filiation.accent,
    "--deity-light": filiation.light,
    "--deity-deep": filiation.deep,
    "--deity-secondary": filiation.secondary,
  } as React.CSSProperties;

  function patch<K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) {
    setSheet((current) => ({ ...current, [key]: value }));
  }

  function patchPersonality(key: keyof CharacterSheet["personality"], value: string) {
    setSheet((current) => ({ ...current, personality: { ...current.personality, [key]: value } }));
  }

  function updateVitalMaximum(resource: "hp" | "mana", maximumKey: "hpMax" | "manaMax", value: number) {
    const nextMaximum = Math.max(0, Number.isFinite(value) ? value : 0);
    setSheet((current) => ({ ...current, [maximumKey]: nextMaximum, [resource]: Math.min(Math.max(0, current[resource]), nextMaximum) }));
  }

  function adjustHp(delta: number) {
    setSheet((current) => {
      if (delta > 0 && current.hp >= current.hpMax) return { ...current, hpTemp: Math.max(0, current.hpTemp + delta) };
      if (delta < 0 && current.hpTemp > 0) return { ...current, hpTemp: Math.max(0, current.hpTemp + delta) };
      return { ...current, hp: Math.min(Math.max(0, current.hpMax), Math.max(0, current.hp + delta)) };
    });
  }

  function adjustMana(delta: number) {
    setSheet((current) => ({ ...current, mana: Math.min(Math.max(0, current.manaMax), Math.max(0, current.mana + delta)) }));
  }

  async function setAvatar(file?: File) {
    if (!file) return;
    try {
      patch("avatarDataUrl", await prepareAvatar(file));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível usar esta imagem.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(sheet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sheet.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-") || "personagem"}-semideuses.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = normalizeImportedSheet(JSON.parse(String(reader.result)));
        if (!result.recognized) throw new Error("Formato inválido");
        setSheet(result.sheet);
        setImportNotice([...result.report.adjustments, ...(result.report.unknownFields.length ? [`Campos desconhecidos preservados: ${result.report.unknownFields.join(", ")}`] : [])]);
      } catch {
        window.alert("Este arquivo não contém uma ficha compatível.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function newSheet() {
    if (!window.confirm("Criar uma nova ficha? A ficha atual pode ser recuperada pelo JSON exportado.")) return;
    setSheet({
      ...INITIAL_SHEET,
      name: "",
      player: "",
      abilityGroups: { abilities: [], filiation: [], path: [], skills: [], talents: [] },
      equipment: [],
      personality: { trait: "", ideal: "", bond: "", flaw: "", backgroundTrait: "", backgroundBond: "", appearance: "", history: "", notes: "" },
    });
  }

  function printSheet() {
    setEquipmentFilter("Todos");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  const filteredEquipment = sheet.equipment.filter((item) => {
    const matchesType = equipmentFilter === "Todos" || item.type === equipmentFilter;
    const matchesMode = equipmentMode === "Todos" || (equipmentMode === "Equipados" ? item.equipped : !item.equipped);
    const query = equipmentSearch.trim().toLocaleLowerCase();
    const matchesSearch = !query || [item.name, item.type, item.properties, item.notes, item.attack, item.damage].join(" ").toLocaleLowerCase().includes(query);
    return matchesType && matchesMode && matchesSearch;
  });
  const equippedCount = sheet.equipment.filter((item) => item.equipped).length;
  const inventoryCount = sheet.equipment.length - equippedCount;
  const equipmentGroups = (["Equipados", "Inventário"] as const)
    .map((group) => ({ group, items: filteredEquipment.filter((item) => group === "Equipados" ? item.equipped : !item.equipped) }))
    .filter(({ group, items }) => (equipmentMode === "Todos" || equipmentMode === group) && items.length > 0);

  return (
    <main
      className="app-shell"
      data-filiation={sheet.filiation || "Sem filiação"}
      data-deity-mark={filiation.mark}
      style={rootStyle}
      ref={rootRef}
    >
      <header className="app-nav">
        <a className="wordmark" href="#inicio"><span>Σ</span><b>SEMIDEUSES</b></a>
        <nav><a href="#combate">Combate</a><a href="#habilidades">Habilidades</a><a href="#equipamentos">Equipamentos</a><a href="#historia">História</a></nav>
        <div className="document-actions">
          <span className={saved ? "save-visible" : ""}>Salvo</span>
          <button type="button" onClick={newSheet}>Nova</button>
          <button type="button" onClick={() => importRef.current?.click()}>Importar</button>
          <button type="button" onClick={exportJson}>JSON</button>
          <label className="pdf-format-control">
            <span>Formato</span>
            <select aria-label="Formato do PDF" value={printFormat} onChange={(event) => setPrintFormat(event.target.value as PrintFormat)}>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="A5">A5</option>
            </select>
          </label>
          <button type="button" className="primary-action" onClick={printSheet}>PDF</button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJson} />
        </div>
      </header>
      {importNotice.length > 0 && (
        <aside className="import-notice" role="status">
          <strong>Importação ajustada</strong>
          <span>{importNotice.slice(0, 3).join(" · ")}</span>
          <button type="button" onClick={() => setImportNotice([])} aria-label="Fechar aviso">×</button>
        </aside>
      )}

      <div className="site-content" id="inicio">
        <section className="hero-shell" data-deity-mark={filiation.mark}>
          <div className="hero-identity">
            <div
              className={`portrait-frame ${sheet.avatarDataUrl ? "has-photo" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void setAvatar(event.dataTransfer.files[0]);
              }}
            >
              {sheet.avatarDataUrl
                ? <img src={sheet.avatarDataUrl} alt={`Retrato de ${sheet.name || "personagem"}`} />
                : <span aria-hidden="true">{(sheet.name || "").slice(0, 1) || "Σ"}</span>}
              <label className="avatar-upload">
                <span>{sheet.avatarDataUrl ? "Trocar" : "Foto"}</span>
                <input ref={avatarInputRef} aria-label="Selecionar foto do personagem" type="file" accept="image/*" onChange={(event) => void setAvatar(event.target.files?.[0])} />
              </label>
              {sheet.avatarDataUrl && <button type="button" aria-label="Remover foto" className="avatar-remove" onClick={() => patch("avatarDataUrl", "")}>×</button>}
            </div>
            <div className="identity-fields">
              <label className="name-field"><span>Nome do herói</span><input placeholder="Nome do personagem" value={sheet.name} onChange={(event) => patch("name", event.target.value)} /></label>
              <div className={`identity-row ${sheet.level >= 20 ? "has-legend" : ""}`}>
                <label className="identity-filiation"><span>Filiação</span><select value={sheet.filiation} onChange={(event) => {
                  const name = event.target.value;
                  const selected = FILIATIONS[name as keyof typeof FILIATIONS];
                  setSheet((current) => ({
                    ...current,
                    filiation: name,
                    divineResource: selected ? Math.min(current.divineResource, selected.max) : 0,
                    filiationSignatures: name
                      ? ensureFiliationSignatures(current.filiationSignatures, name)
                      : current.filiationSignatures,
                  }));
                }}>{[<option key="empty" value="">Escolha uma filiação</option>, ...Object.keys(FILIATIONS).map((name) => <option key={name} value={name}>{name}</option>)]}</select></label>
                <label className="identity-path"><span>Caminho divino</span><input value={sheet.pathName} onChange={(event) => patch("pathName", event.target.value)} /></label>
                <label className="identity-origin"><span>Origem</span><input list="origin-options" placeholder="Ex.: Semideus Grego" value={sheet.origin} onChange={(event) => patch("origin", event.target.value)} /></label>
                <label className="identity-level"><span>Nível</span><input type="number" min={1} value={sheet.level} onChange={(event) => patch("level", Math.max(1, Number(event.target.value)))} /></label>
                {sheet.level >= 20 && (
                  <button
                    type="button"
                    className={`legend-trigger ${sheet.legendDestiny ? "is-chosen" : ""}`}
                    onClick={() => setLegendOpen(true)}
                  >
                    <span>Caminho da Lenda</span>
                    <strong>{sheet.legendDestiny || "Definir destino"}</strong>
                  </button>
                )}
              </div>
              <datalist id="origin-options">{ORIGIN_SUGGESTIONS.map((origin) => <option key={origin} value={origin} />)}</datalist>
              <div className="identity-secondary">
                <label><span>Antecedente</span><input value={sheet.background} onChange={(event) => patch("background", event.target.value)} /></label>
                <label><span>Jogador</span><input value={sheet.player} onChange={(event) => patch("player", event.target.value)} /></label>
              </div>
            </div>
          </div>

          <div className="combat-dashboard" id="combate" style={{ "--resource-texture": `url(${RESOURCE_ASSETS.texture})` } as CSSProperties}>
            <section className="vitals-block">
              <div className="vital-row">
                <NumberControl label="PV" value={sheet.hp} max={sheet.hpMax} iconSrc={RESOURCE_ASSETS.health} onChange={(value) => patch("hp", Math.min(Math.max(0, value), Math.max(0, sheet.hpMax)))} onIncrease={() => adjustHp(1)} onDecrease={() => adjustHp(-1)} onMaxChange={(value) => updateVitalMaximum("hp", "hpMax", value)} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={sheet.hpMax} onChange={(event) => patch("hpMax", Number(event.target.value))} /></label>
                <ResourceBar label="PV" value={sheet.hp} max={sheet.hpMax} temp={sheet.hpTemp} color="var(--health)" kind="health" onChange={(value) => patch("hp", value)} />
                <label className="temp-value">Temporário<input type="number" min={0} value={sheet.hpTemp} onChange={(event) => patch("hpTemp", Number(event.target.value))} /></label>
              </div>
              <div className="vital-row mana-row">
                <NumberControl label="MP" value={sheet.mana} max={sheet.manaMax} iconSrc={RESOURCE_ASSETS.mana} onChange={(value) => patch("mana", Math.min(Math.max(0, value), Math.max(0, sheet.manaMax)))} onIncrease={() => adjustMana(1)} onDecrease={() => adjustMana(-1)} onMaxChange={(value) => updateVitalMaximum("mana", "manaMax", value)} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={sheet.manaMax} onChange={(event) => patch("manaMax", Number(event.target.value))} /></label>
                <ResourceBar label="MP" value={sheet.mana} max={sheet.manaMax} color="var(--mana)" kind="mana" onChange={(value) => patch("mana", value)} />
              </div>
            </section>

            <section className="divine-block">
              <NumberControl label={filiation.resource} value={sheet.divineResource} max={filiation.max} iconSrc={RESOURCE_ASSETS.divine} onChange={(value) => patch("divineResource", value)} />
              <ResourceBar value={sheet.divineResource} max={filiation.max} color="var(--deity)" />
              <div className="pips-line"><span>Favor divino</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Favor divino ${value}`} className={value <= sheet.favor ? "on" : ""} onClick={() => patch("favor", sheet.favor === value ? value - 1 : value)} />)}</div></div>
              <div className="pips-line"><span>Sustentação</span><div>{[1, 2].map((value) => <button key={value} type="button" aria-label={`Sustentação ${value}`} className={value <= sheet.sustain ? "on" : ""} onClick={() => patch("sustain", sheet.sustain === value ? value - 1 : value)} />)}</div><b>{sheet.sustain}/2</b></div>
            </section>

            <section className="combat-facts">
              <div className={`editable-fact ${sheet.caOverride !== null ? "is-overridden" : ""}`}>
                <span>CA</span><strong>{armorClass}</strong><small>{sheet.caOverride === null ? `${automaticArmorClass} automático` : `auto ${automaticArmorClass} · valor manual`}</small>
                <div className="fact-edit"><input type="number" min={0} value={sheet.caOverride ?? armorClass} aria-label="Classe de armadura final" onFocus={(event) => event.currentTarget.select()} onChange={(event) => patch("caOverride", Number(event.target.value))} />{sheet.caOverride !== null && <button type="button" onClick={() => patch("caOverride", null)}>Usar auto</button>}</div>
              </div>
              <div className="initiative-fact">
                <span>Iniciativa</span>
                <div>
                  <strong>{signed(initiative)}</strong>
                  <input className="fact-number-input" type="number" value={sheet.initiativeOverride ?? initiative} aria-label="Iniciativa final" onFocus={(event) => event.currentTarget.select()} onChange={(event) => patch("initiativeOverride", Number(event.target.value))} />
                  {sheet.initiativeOverride !== null && <button type="button" className="fact-reset" onClick={() => patch("initiativeOverride", null)}>Usar auto</button>}
                  <label>
                    <small>Extra</small>
                    <input
                      type="number"
                      value={sheet.initiativeExtra}
                      aria-label="Bônus extra de iniciativa"
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => patch("initiativeExtra", Number(event.target.value))}
                    />
                  </label>
                </div>
                <small>DES {signed(mods.des)} · extra {signed(sheet.initiativeExtra)}</small>
              </div>
              <div className={`editable-fact ${sheet.speedOverride !== null ? "is-overridden" : ""}`}><span>Deslocamento</span><strong>{speed} m</strong><small>{sheet.speedOverride === null ? "automático" : `auto ${automaticSpeed} m · manual`}</small><div className="fact-edit"><input type="number" min={0} value={sheet.speedOverride ?? speed} aria-label="Deslocamento final" onFocus={(event) => event.currentTarget.select()} onChange={(event) => patch("speedOverride", Number(event.target.value))} />{sheet.speedOverride !== null && <button type="button" onClick={() => patch("speedOverride", null)}>Usar auto</button>}</div></div>
              <div className={`editable-fact ${sheet.perceptionOverride !== null ? "is-overridden" : ""}`}><span>Percepção</span><strong>{perception}</strong><small>{sheet.perceptionOverride === null ? "passiva automática" : `auto ${passivePerception} · manual`}</small><div className="fact-edit"><input type="number" min={0} value={sheet.perceptionOverride ?? perception} aria-label="Percepção final" onFocus={(event) => event.currentTarget.select()} onChange={(event) => patch("perceptionOverride", Number(event.target.value))} />{sheet.perceptionOverride !== null && <button type="button" onClick={() => patch("perceptionOverride", null)}>Usar auto</button>}</div></div>
              <div className="casting-panel">
                <span className="casting-title">Conjuração</span>
                <div className="casting-grid">
                  <label className="casting-attribute">
                    <small>Atributo</small>
                    <select value={sheet.castingAttribute} onChange={(event) => patch("castingAttribute", event.target.value as AttributeKey)}>
                      {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <strong className="casting-attribute-print print-only">{ATTRIBUTE_LABELS[sheet.castingAttribute]}</strong>
                  </label>
                  <div className="casting-metric">
                    <small>Ataque de conjuração</small>
                    <strong>{signed(castingAttackBonus)}</strong>
                    <span>atributo {signed(castingModifier)} · prof. {signed(prof)}</span>
                  </div>
                  <div className={`casting-metric casting-dc ${sheet.castingDcOverride !== null ? "is-overridden" : ""}`}>
                    <label htmlFor="casting-dc">CD das habilidades</label>
                    <input
                      id="casting-dc"
                      type="number"
                      min={0}
                      max={99}
                      value={castingDc}
                      aria-label="CD das habilidades"
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => patch("castingDcOverride", event.target.value === "" ? null : Number(event.target.value))}
                    />
                    <strong className="casting-dc-print print-only">{castingDc}</strong>
                    <span>{sheet.castingDcOverride === null ? `base 8 · atributo ${signed(castingModifier)} · prof. ${signed(prof)}` : "valor manual"}</span>
                    {sheet.castingDcOverride !== null && (
                      <button type="button" onClick={() => patch("castingDcOverride", null)} aria-label="Usar CD das habilidades automática">Usar auto</button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="saving-throws">
              <div className="compact-heading"><h2>Testes de resistência</h2><span>proficiência {signed(prof)}</span></div>
              <div>{(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => {
                const trained = sheet.saveProficiencies.includes(key);
                return <button key={key} type="button" className={trained ? "trained" : ""} onClick={() => patch("saveProficiencies", trained ? sheet.saveProficiencies.filter((item) => item !== key) : [...sheet.saveProficiencies, key])}><span>{ATTRIBUTE_LABELS[key]}</span><strong>{signed(mods[key] + (trained ? prof : 0))}</strong></button>;
              })}</div>
            </section>
          </div>
        </section>

        <section className="stats-layout reveal-section">
          <div className="attributes-column">
            <div className="editorial-heading"><h2>Atributos</h2></div>
            {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
              <label className="attribute-line" key={key}>
                <span>{ATTRIBUTE_LABELS[key]}</span>
                <input type="number" min={1} max={30} value={sheet.attributes[key]} onChange={(event) => patch("attributes", { ...sheet.attributes, [key]: Number(event.target.value) })} />
                <strong>{signed(mods[key])}</strong>
              </label>
            ))}
          </div>
          <div className="skills-column">
            <div className="editorial-heading with-key"><h2>Perícias</h2><small>toque: proficiente · especialista</small></div>
            <div className="skills-grid">{SKILLS.map(([name, key]) => {
              const rank = sheet.skillRanks[name] || 0;
              return <button type="button" className={`skill-entry rank-${rank}`} key={name} onClick={() => patch("skillRanks", { ...sheet.skillRanks, [name]: (rank + 1) % 3 })}><i /><span>{name}<small>{ATTRIBUTE_LABELS[key]}</small></span><strong>{signed(mods[key] + prof * rank)}</strong></button>;
            })}</div>
          </div>
        </section>

        <section className="abilities-section reveal-section" id="habilidades">
          <div className="section-toolbar abilities-toolbar">
            <h2>Habilidades</h2>
            <div className="ability-toolbar-controls">
              <label className="ability-search"><span className="sr-only">Buscar habilidades</span><input value={abilitySearch} placeholder="Buscar por nome, custo ou ação" onChange={(event) => setAbilitySearch(event.target.value)} /></label>
              <label className="ability-filter"><span className="sr-only">Filtrar categoria</span><select value={abilityCategoryFilter} onChange={(event) => setAbilityCategoryFilter(event.target.value)}><option>Todas</option><option value="abilities">Gerais</option><option value="path">Caminho</option><option value="skills">Skills</option><option value="filiation">Filiação</option><option value="talents">Talentos</option></select></label>
              <label className="ability-filter"><span className="sr-only">Filtrar ação</span><select value={abilityActionFilter} onChange={(event) => setAbilityActionFilter(event.target.value)}><option value="">Todas as ações</option><option>Passiva</option><option>Ação</option><option>Ação Bônus</option><option>Reação</option></select></label>
              <button type="button" className="ability-expand-toggle" onClick={() => setAbilityExpandAll(abilityExpandAll === true ? false : true)}>{abilityExpandAll === true ? "Recolher tudo" : "Expandir tudo"}</button>
            </div>
          </div>
          <AbilityLayout sheet={sheet} compact={compactViewport} search={abilitySearch} actionFilter={abilityActionFilter} categoryFilter={abilityCategoryFilter} expandAll={abilityExpandAll} onChange={(updater) => setSheet(updater)} />
        </section>

        <section className="equipment-section reveal-section" id="equipamentos">
          <div className="section-toolbar equipment-toolbar">
            <h2>Equipamentos</h2>
            <div className="equipment-ac-summary"><span>CA com equipamentos</span><strong>{armorClass}</strong><small>{equippedArmor.length ? `${equippedArmor.length} armadura${equippedArmor.length > 1 ? "s" : ""} equipada${equippedArmor.length > 1 ? "s" : ""}` : "base + bônus equipados"}</small></div>
            <div className="equipment-actions">
              <label className="currency-field">
                <span><CoinIcon /> Dracmas</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={sheet.dracmas}
                  onChange={(event) => patch("dracmas", Math.max(0, Number(event.target.value)))}
                />
              </label>
              <div className="currency-print print-only"><span>Dracmas</span><strong>{sheet.dracmas}</strong></div>
              <label className="currency-field human-money-field">
                <span>Dinheiro humano</span>
                <div><input className="currency-symbol-input" aria-label="Símbolo do dinheiro humano" value={sheet.humanMoneyCurrency} maxLength={4} onChange={(event) => patch("humanMoneyCurrency", event.target.value)} /><input type="number" min={0} inputMode="decimal" value={sheet.humanMoney} onChange={(event) => patch("humanMoney", Math.max(0, Number(event.target.value)))} /></div>
              </label>
              <div className="currency-print print-only"><span>Dinheiro humano</span><strong>{sheet.humanMoneyCurrency} {sheet.humanMoney}</strong></div>
              <button type="button" className="large-add" onClick={() => patch("equipment", [...sheet.equipment, { id: makeId("eq"), name: "", type: "Outro", quantity: 1, equipped: false, armorClass: 0, attack: "", damage: "", properties: "", notes: "" }])}>Adicionar equipamento</button>
            </div>
          </div>
          <div className="equipment-workspace">
            <div className="equipment-control-row">
              <label className="equipment-search"><span className="sr-only">Buscar equipamentos</span><input value={equipmentSearch} placeholder="Buscar equipamento" onChange={(event) => setEquipmentSearch(event.target.value)} /></label>
              <div className="equipment-mode-filters" aria-label="Estado do inventário">{(["Todos", "Equipados", "Inventário"] as const).map((mode) => <button type="button" key={mode} className={equipmentMode === mode ? "active" : ""} onClick={() => setEquipmentMode(mode)}>{mode} <small>{mode === "Todos" ? sheet.equipment.length : mode === "Equipados" ? equippedCount : inventoryCount}</small></button>)}</div>
            </div>
            <div className="equipment-filters" aria-label="Tipos de equipamento">{["Todos", ...EQUIPMENT_TYPES].map((type) => <button type="button" key={type} className={equipmentFilter === type ? "active" : ""} onClick={() => setEquipmentFilter(type)}>{type}</button>)}</div>
            <div className="equipment-groups">
              {equipmentGroups.length === 0 ? <p className="empty-state equipment-empty-state">Nenhum equipamento corresponde aos filtros atuais. Adicione um item ou escolha outra categoria.</p> : equipmentGroups.map(({ group, items }) => <section className="equipment-group" key={group}><header><h3>{group}</h3><span>{items.length}</span></header><div className="equipment-list">{items.map((item) => <EquipmentEditor key={item.id} item={item} onUpdate={(updated) => patch("equipment", sheet.equipment.map((current) => current.id === item.id ? updated : current))} onRemove={() => patch("equipment", sheet.equipment.filter((current) => current.id !== item.id))} />)}</div></section>)}
            </div>
            <div className="print-equipment-list print-only">
              {sheet.equipment.map((item) => (
                <article key={`print-${item.id}`}>
                  <header><strong>{item.name || "Equipamento sem nome"}</strong><span>{item.type} · qtd. {item.quantity}{item.equipped ? " · equipado" : ""}</span></header>
                  <dl>
                    {item.armorClass !== 0 && <><dt>CA</dt><dd>{signed(item.armorClass)}</dd></>}
                    {item.attack && <><dt>Ataque</dt><dd>{item.attack}</dd></>}
                    {item.damage && <><dt>Dano</dt><dd>{item.damage}</dd></>}
                    {item.properties && <><dt>Propriedades</dt><dd>{item.properties}</dd></>}
                    {item.notes && <><dt>Notas</dt><dd>{item.notes}</dd></>}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="story-section reveal-section" id="historia">
          <div className="section-toolbar"><h2>História e traços</h2></div>
          <div className="personality-grid">
            <label><span>Traço</span><textarea value={sheet.personality.trait} onChange={(event) => patchPersonality("trait", event.target.value)} /><div className="print-value print-only">{sheet.personality.trait || "—"}</div></label>
            <label><span>Ideal</span><textarea value={sheet.personality.ideal} onChange={(event) => patchPersonality("ideal", event.target.value)} /><div className="print-value print-only">{sheet.personality.ideal || "—"}</div></label>
            <label><span>Vínculo</span><textarea value={sheet.personality.bond} onChange={(event) => patchPersonality("bond", event.target.value)} /><div className="print-value print-only">{sheet.personality.bond || "—"}</div></label>
            <label><span>Falha</span><textarea value={sheet.personality.flaw} onChange={(event) => patchPersonality("flaw", event.target.value)} /><div className="print-value print-only">{sheet.personality.flaw || "—"}</div></label>
            <label><span>Traço do antecedente</span><textarea value={sheet.personality.backgroundTrait} onChange={(event) => patchPersonality("backgroundTrait", event.target.value)} /><div className="print-value print-only">{sheet.personality.backgroundTrait || "—"}</div></label>
            <label><span>Vínculo do antecedente</span><textarea value={sheet.personality.backgroundBond} onChange={(event) => patchPersonality("backgroundBond", event.target.value)} /><div className="print-value print-only">{sheet.personality.backgroundBond || "—"}</div></label>
            <label className="wide"><span>Aparência</span><textarea value={sheet.personality.appearance} onChange={(event) => patchPersonality("appearance", event.target.value)} /><div className="print-value print-only">{sheet.personality.appearance || "—"}</div></label>
            <label className="tall"><span>História</span><textarea value={sheet.personality.history} onChange={(event) => patchPersonality("history", event.target.value)} /><div className="print-value print-only">{sheet.personality.history || "—"}</div></label>
            <label className="tall"><span>Notas</span><textarea value={sheet.personality.notes} onChange={(event) => patchPersonality("notes", event.target.value)} /><div className="print-value print-only">{sheet.personality.notes || "—"}</div></label>
          </div>
        </section>
      </div>

      <footer>
        <span>Σ</span>
        <p>Dados salvos somente neste navegador. Use JSON para transportar a ficha.</p>
        <a
          className="support-link"
          href="https://github.com/JvCarvalho07/semideuses-rpg"
          target="_blank"
          rel="noreferrer"
          aria-label="Apoiar o projeto no GitHub com uma estrela"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.5 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.1 1.2a10.8 10.8 0 0 1 5.7 0c2.2-1.5 3.1-1.2 3.1-1.2.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.4 11.4 0 0 0 12 .8Z" />
          </svg>
          <span>Apoiar</span>
          <span className="support-tooltip" role="tooltip">Gostou da ficha? Se quiser apoiar o projeto, deixe uma estrela no GitHub.</span>
        </a>
        <a href="#inicio">Voltar ao início</a>
      </footer>

      {legendOpen && (
        <div
          className="legend-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legend-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLegendOpen(false);
          }}
        >
          <section className="legend-dialog-panel">
            <button type="button" className="legend-close" aria-label="Fechar Caminho da Lenda" onClick={() => setLegendOpen(false)}>×</button>
            <div className="legend-intro">
              <span>Nível 20</span>
              <h2 id="legend-title">O que restará quando a aventura terminar?</h2>
              <p>O poder já não é a pergunta. Agora seu personagem decide o que fará com a própria lenda.</p>
              {sheet.legendDestiny && <small>Destino atual: <strong>{sheet.legendDestiny}</strong></small>}
            </div>
            <div className="legend-choices">
              {LEGEND_CHOICES.map((choice) => (
                <button
                  type="button"
                  className={`legend-choice ${sheet.legendDestiny === choice.value ? "is-selected" : ""}`}
                  aria-pressed={sheet.legendDestiny === choice.value}
                  key={choice.value}
                  onClick={() => {
                    patch("legendDestiny", choice.value);
                    setLegendOpen(false);
                  }}
                >
                  <strong>{choice.title}</strong>
                  <span>{choice.description}</span>
                </button>
              ))}
              <button type="button" className="legend-later" onClick={() => setLegendOpen(false)}>Decidir depois</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
