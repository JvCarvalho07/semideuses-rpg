import { useState, type ReactNode } from "react";

/**
 * Número do painel de combate (CA, iniciativa, deslocamento, percepção).
 * O ajuste manual fica escondido atrás do lápis, para a leitura em jogo ficar limpa;
 * quando há valor manual o campo aparece sozinho, com o botão "Usar auto".
 */
export function Fact({
  label,
  iconSrc,
  display,
  hint,
  value,
  overridden,
  hero,
  extra,
  onOverride,
  onReset,
}: {
  label: string;
  iconSrc: string;
  display: ReactNode;
  hint: ReactNode;
  /** Valor mostrado no campo de ajuste. */
  value: number;
  overridden: boolean;
  /** Destaque maior (a CA). */
  hero?: boolean;
  /** Campo extra dentro do ajuste (ex.: bônus extra de iniciativa). */
  extra?: ReactNode;
  onOverride: (value: number) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const open = editing || overridden;
  return (
    <div className={`editable-fact ${overridden ? "is-overridden" : ""} ${hero ? "is-hero" : ""}`}>
      <span className="fact-label">
        <img src={iconSrc} width={24} height={24} loading="lazy" decoding="async" alt="" />
        <span>{label}</span>
        <button type="button" className="fact-pencil" aria-label={`Ajustar ${label} à mão`} aria-expanded={open} title="Ajustar à mão" onClick={() => setEditing(!editing)}>✎</button>
      </span>
      <strong>{display}</strong>
      <small>{hint}{overridden && <b className="manual-tag">manual</b>}</small>
      {open && (
        <div className="fact-edit">
          <input type="number" value={value} aria-label={`${label} final`} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onOverride(Number(event.target.value))} />
          {overridden && <button type="button" onClick={onReset}>Usar auto</button>}
          {extra}
        </div>
      )}
    </div>
  );
}
