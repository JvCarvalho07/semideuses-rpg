import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { makeId, type FiliationSignatureState } from "../model";
import { makeOfficialState, signatureDefinition } from "../filiationSignatures";
import { ASSETS } from "../assets";
import { filiationSeal, formatActivationLabel, formatCostLabel } from "./format";

export function SignatureReadOnly({
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
  const resourceMin = resource?.min ?? 0;
  const resourceMax = Math.max(resourceMin, resource?.max || 0);
  const resourceCurrent = Math.min(resourceMax, Math.max(resourceMin, resource?.current || 0));
  const resourceSpan = resourceMax - resourceMin;
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
          <div className="signature-resource-meter" role="progressbar" aria-valuemin={resourceMin} aria-valuemax={resourceMax} aria-valuenow={resourceCurrent}><i style={{ width: `${resourceSpan ? ((resourceCurrent - resourceMin) / resourceSpan) * 100 : 0}%` }} /></div>
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

export function SignatureEditor({
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
            {draft.custom && !draft.resource && <button type="button" className="secondary-action" onClick={() => update({ resource: { name: "Recurso", current: 0, max: 0, unit: "cargas" } })}>Adicionar medidor</button>}
            {draft.custom && draft.resource && <div className="signature-resource"><label>Nome<input value={draft.resource.name} onChange={(event) => update({ resource: { ...draft.resource!, name: event.target.value } })} /></label><label>Atual<input type="number" min={0} value={draft.resource.current} onChange={(event) => update({ resource: { ...draft.resource!, current: Math.max(0, Number(event.target.value)) } })} /></label><label>Máximo<input type="number" min={0} value={draft.resource.max} onChange={(event) => { const max = Math.max(0, Number(event.target.value)); update({ resource: { ...draft.resource!, max, current: Math.min(max, Math.max(0, draft.resource!.current)) } }); }} /></label><label>Unidade<input value={draft.resource.unit} onChange={(event) => update({ resource: { ...draft.resource!, unit: event.target.value } })} /></label><button type="button" className="remove-action" onClick={() => update({ resource: undefined })}>Remover medidor</button></div>}
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

export function SignatureCard({
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
  // No papel, a regra aparece uma vez só: os gastos já estão listados abaixo, um por linha.
  const printedRules = (moves.length ? item.officialSnapshot?.rules?.split(/\s*Gast(?:os?|ar)\b[^:.]*:/)[0] : item.officialSnapshot?.rules)?.trim() || "";
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
          <span className="signature-mark" aria-hidden="true"><img src={filiationSeal(filiationName).src} width={34} height={34} loading="lazy" decoding="async" alt="" /></span>
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
        {printedRules && <p>{printedRules}</p>}
        {item.summary && !printedRules && <p>{item.summary}</p>}
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

export function SignatureWorkspace({
  filiationName,
  items,
  onChange,
}: {
  filiationName: string;
  items: FiliationSignatureState[];
  onChange: (items: FiliationSignatureState[]) => void;
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
    setEditingId(null);
  };
  const restore = (item: FiliationSignatureState) => {
    const definition = signatureDefinition(item);
    return definition ? { ...makeOfficialState(definition, filiationName), id: item.id } : item;
  };
  return (
    <section className="filiation-signature-section ability-category">
      <div className="category-heading"><div><h3><img className="section-medallion" src={ASSETS.sections.signature.src} width={30} height={30} loading="lazy" decoding="async" alt="" />Assinatura da filiação</h3><small>Regras centrais e recurso próprio da divindade.</small></div><span>{items.length}</span><button type="button" onClick={addCustom} disabled={!filiationName}>Adicionar assinatura</button></div>
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
