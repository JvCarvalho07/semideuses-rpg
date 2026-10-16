// Itens prontos do livro (Cap. 8) para adicionar à ficha com um clique. Só usa `import type` de ./model.
import type { Equipment } from "./model";
import { ARMOR_CATALOG } from "./rules.ts";
import { WEAPON_CATALOG } from "./weaponCatalog.ts";

export type CatalogGroup = { label: string; entries: string[] };

/** Grupos exibidos no seletor "Adicionar do livro". */
export const CATALOG_GROUPS: CatalogGroup[] = [
  { label: "Armas simples", entries: WEAPON_CATALOG.filter((weapon) => weapon.category === "Simples").map((weapon) => weapon.name) },
  { label: "Armas marciais", entries: WEAPON_CATALOG.filter((weapon) => weapon.category === "Marcial").map((weapon) => weapon.name) },
  { label: "Armaduras", entries: ARMOR_CATALOG.filter((armor) => armor.type === "Armadura").map((armor) => armor.name) },
  { label: "Escudos", entries: ARMOR_CATALOG.filter((armor) => armor.type === "Escudo").map((armor) => armor.name) },
];

/** Monta o equipamento a partir do nome no catálogo (undefined se não existir). */
export function equipmentFromCatalog(name: string, id: string): Equipment | undefined {
  const weapon = WEAPON_CATALOG.find((entry) => entry.name === name);
  if (weapon) {
    const properties = [weapon.properties, weapon.range && `alcance ${weapon.range}`, `${weapon.category}, ${weapon.kind.toLowerCase()}`].filter(Boolean).join(" · ");
    const cost = weapon.cost === null ? "" : `Custo: ${weapon.cost} drc.`;
    return {
      id, name: weapon.name, type: "Arma", quantity: 1, equipped: false, armorClass: 0, armorCategory: "", attack: "",
      damage: [weapon.damage, weapon.damageType].filter(Boolean).join(" "), properties, notes: [weapon.note, cost].filter(Boolean).join(" "),
    };
  }
  const armor = ARMOR_CATALOG.find((entry) => entry.name === name);
  if (armor) {
    return {
      id, name: armor.name, type: armor.type, quantity: 1, equipped: false, armorClass: armor.ac, armorCategory: armor.category ?? "",
      attack: "", damage: "", properties: armor.properties, notes: "",
    };
  }
  return undefined;
}

export function blankEquipment(id: string): Equipment {
  return { id, name: "", type: "Outro", quantity: 1, equipped: false, armorClass: 0, armorCategory: "", attack: "", damage: "", properties: "", notes: "" };
}
