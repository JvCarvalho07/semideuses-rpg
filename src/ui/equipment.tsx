import { useState } from "react";
import { makeId, type Equipment } from "../model";
import { ARMOR_CATEGORIES, signed, type ArmorCategory } from "../rules";
import { CATALOG_GROUPS, blankEquipment, equipmentFromCatalog } from "../catalogItems";
import { EQUIPMENT_TYPES } from "./config";
import { equipmentAsset } from "./format";

/** Resumo de uma linha: o que o item faz na ficha (CA, dano, bônus). */
function itemChips(item: Equipment): string[] {
  const chips: string[] = [];
  if (item.type === "Armadura") chips.push(item.armorClass ? `CA ${item.armorCategory ? `${item.armorClass} base` : item.armorClass}` : "CA não informada", ...(item.armorCategory ? [item.armorCategory] : []));
  else if (item.armorClass) chips.push(`${signed(item.armorClass)} CA`);
  if (item.damage) chips.push(item.damage);
  if (item.attack) chips.push(`ataque ${item.attack}`);
  return chips;
}

export function EquipmentRow({
  item,
  warning,
  onUpdate,
  onToggleEquipped,
  onRemove,
}: {
  item: Equipment;
  warning?: string;
  onUpdate: (item: Equipment) => void;
  onToggleEquipped: (equipped: boolean) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!item.name);
  const update = <K extends keyof Equipment>(key: K, value: Equipment[K]) => onUpdate({ ...item, [key]: value });
  const chips = itemChips(item);
  const modelGroups = CATALOG_GROUPS.filter((group) => (item.type === "Arma" ? group.label.startsWith("Armas") : item.type === "Armadura" ? group.label === "Armaduras" : item.type === "Escudo" ? group.label === "Escudos" : false));
  return (
    <article className={`equipment-row ${item.equipped ? "is-equipped" : ""} ${open ? "is-open" : ""}`}>
      <div className="equipment-row-main">
        <span className="equipment-symbol"><img src={equipmentAsset(item.type).src} width={30} height={30} loading="lazy" decoding="async" alt="" /></span>
        <div className="equipment-row-title">
          <strong>{item.name || "Novo item"}</strong>
          <small>{[item.type, ...chips].join(" · ")}</small>
        </div>
        {warning && <em className="equipment-warning" title={warning}>Sem proficiência</em>}
        <div className="equipment-row-actions">
        <div className="qty-stepper" role="group" aria-label={`Quantidade de ${item.name || "item"}`}>
          <button type="button" aria-label="Diminuir quantidade" disabled={item.quantity <= 0} onClick={() => update("quantity", Math.max(0, item.quantity - 1))}>−</button>
          <span>×{item.quantity}</span>
          <button type="button" aria-label="Aumentar quantidade" onClick={() => update("quantity", item.quantity + 1)}>+</button>
        </div>
        <button type="button" className={`equip-toggle ${item.equipped ? "on" : ""}`} aria-pressed={item.equipped} title={item.equipped ? "Guardar na mochila" : "Equipar"} onClick={() => onToggleEquipped(!item.equipped)}>
          {item.equipped ? "✓ Equipado" : "Equipar"}
        </button>
        <button type="button" className="row-edit" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Fechar" : "Editar"}</button>
        </div>
      </div>
      {open && (
        <div className="equipment-editor">
          {warning && <p className="equipment-warning-text span-full">{warning}</p>}
          <label className="span-2">Nome<input value={item.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Tipo<select value={item.type} onChange={(event) => update("type", event.target.value)}>{EQUIPMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          {modelGroups.length > 0 && (
            <label className="span-2">Modelo do livro
              <select value="" onChange={(event) => {
                const model = equipmentFromCatalog(event.target.value, item.id);
                if (model) onUpdate({ ...model, quantity: item.quantity, equipped: item.equipped });
              }}>
                <option value="">Preencher com um item do livro…</option>
                {modelGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.entries.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}
              </select>
            </label>
          )}
          {item.type === "Armadura" && (
            <label>Categoria
              <select value={item.armorCategory ?? ""} onChange={(event) => update("armorCategory", event.target.value as ArmorCategory | "")}>
                <option value="">CA final (manual)</option>
                {ARMOR_CATEGORIES.map((category) => <option key={category} value={category}>{category}{category === "Leve" ? " · + DES" : category === "Média" ? " · + DES (máx. +2)" : " · fixa"}</option>)}
              </select>
            </label>
          )}
          {(item.type === "Armadura" || item.type === "Escudo" || item.armorClass !== 0) && (
            <label>{item.type === "Armadura" ? (item.armorCategory ? "CA base" : "CA final") : "Bônus de CA"}<input type="number" value={item.armorClass} onChange={(event) => update("armorClass", Number(event.target.value))} /></label>
          )}
          {item.type === "Arma" && <label>Ataque (bônus)<input value={item.attack} placeholder="ex.: +8" onChange={(event) => update("attack", event.target.value)} /></label>}
          {(item.type === "Arma" || item.damage) && <label>Dano<input value={item.damage} placeholder="ex.: 1d8 Cortante" onChange={(event) => update("damage", event.target.value)} /></label>}
          <label className="span-2">Propriedades<input value={item.properties} onChange={(event) => update("properties", event.target.value)} /></label>
          <label className="span-full">Notas<textarea value={item.notes} onChange={(event) => update("notes", event.target.value)} /></label>
          <button type="button" className="remove-action" onClick={() => { if (window.confirm(`Remover ${item.name || "este item"}?`)) onRemove(); }}>Remover item</button>
        </div>
      )}
    </article>
  );
}

export function EquipmentAdder({ onAdd }: { onAdd: (item: Equipment) => void }) {
  return (
    <div className="equipment-adder">
      <label className="equipment-catalog">
        <span>Adicionar equipamento do livro</span>
        <select value="" onChange={(event) => {
          const item = equipmentFromCatalog(event.target.value, makeId("eq"));
          if (item) onAdd(item);
        }}>
          <option value="">Escolher arma, armadura ou escudo…</option>
          {CATALOG_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.entries.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}
        </select>
      </label>
      <button type="button" className="large-add" onClick={() => onAdd(blankEquipment(makeId("eq")))}>Item em branco</button>
    </div>
  );
}
