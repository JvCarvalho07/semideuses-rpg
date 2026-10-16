import { ASSETS, FILIATION_SEALS } from "../assets";
import { PrintFormat } from "./config";

export function normalizedLabel(value: string) {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

export function formatCostValue(value: string | undefined, resourceName?: string) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const normalized = normalizedLabel(raw).replace(/[—–]/g, "-");
  if (normalized === "-" || normalized === "sem custo" || /^0(?:[.,]0)?$/.test(normalized)) return "Sem custo";
  if (resourceName && /^\d+(?:[.,]\d+)?$/.test(raw)) return `${raw} ${resourceName}`;
  return raw;
}

export function formatCostLabel(value: string | undefined, resourceName?: string) {
  const formatted = formatCostValue(value, resourceName);
  if (!formatted) return "";
  return formatted === "Sem custo" ? formatted : `Custo: ${formatted}`;
}

export function formatActivationLabel(value: string | undefined) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const normalized = normalizedLabel(raw);
  return normalized.includes("conforme descricao") || normalized.includes("passiva") || normalized.includes("sempre")
    ? `Ativação: ${raw}`
    : `Ação: ${raw}`;
}

export function filiationSeal(filiationName: string) {
  return FILIATION_SEALS[filiationName as keyof typeof FILIATION_SEALS] || ASSETS.resources.divine;
}

export function equipmentAsset(type: string) {
  return ASSETS.equipment[type as keyof typeof ASSETS.equipment] || ASSETS.equipment.Outro;
}

export function initialPrintFormat(): PrintFormat {
  const queryFormat = new URLSearchParams(window.location.search).get("paper");
  if (queryFormat === "A3" || queryFormat === "A4" || queryFormat === "A5") return queryFormat;
  const storedFormat = localStorage.getItem("semideuses-print-format");
  return storedFormat === "A3" || storedFormat === "A5" ? storedFormat : "A4";
}
