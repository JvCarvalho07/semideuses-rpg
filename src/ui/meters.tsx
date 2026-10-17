import { ASSETS } from "../assets";

export function NumberControl({
  label,
  value,
  max,
  min = 0,
  iconSrc,
  onChange,
  onIncrease,
  onDecrease,
  onMaxChange,
  autoMax,
  onResetMax,
}: {
  label: string;
  value: number;
  max: number;
  min?: number;
  iconSrc?: string;
  onChange: (value: number) => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onMaxChange?: (value: number) => void;
  autoMax?: number | null;
  onResetMax?: () => void;
}) {
  const increase = onIncrease || (() => onChange(Math.min(Math.max(0, max), Math.max(0, value + 1))));
  const decrease = onDecrease || (() => onChange(Math.max(min, value - 1)));
  return (
    <div className="number-control">
      <span className="number-label">
        {iconSrc && <img className="resource-medallion" src={iconSrc} width={28} height={28} loading="eager" decoding="async" alt="" />}
        <span>{label}</span>
      </span>
      <button type="button" onClick={decrease} aria-label={`Reduzir ${label}`}>−</button>
      <strong>{value}</strong>
      <small>/</small>
      {onMaxChange ? (
        <>
          <span className="max-cell">
          <input
          className="number-max"
          type="number"
          min={0}
          value={Math.max(min, max)}
          aria-label={`Máximo ${label}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onMaxChange(Math.max(0, Number(event.target.value)))}
          />
          {onResetMax && autoMax != null && <button type="button" className="max-reset" onClick={onResetMax} title={`Voltar ao máximo do livro (${autoMax})`} aria-label={`Voltar ao máximo do livro (${autoMax})`}>↺</button>}
          </span>
          <span className="number-max-print print-only">{Math.max(0, max)}</span>
        </>
      ) : <small>{max}</small>}
      <button type="button" onClick={increase} aria-label={`Aumentar ${label}`}>+</button>
    </div>
  );
}

export function ResourceBar({
  value,
  max,
  min = 0,
  color,
  temp,
  label,
  onChange,
  kind,
}: {
  value: number;
  max: number;
  min?: number;
  color: string;
  temp?: number;
  label?: string;
  onChange?: (value: number) => void;
  kind?: "health" | "mana" | "divine";
}) {
  const safeMax = Math.max(min, max);
  const safeValue = Math.min(Math.max(min, value), safeMax);
  const span = safeMax - min;
  const percent = span > 0 ? Math.min(100, ((safeValue - min) / span) * 100) : 0;
  const tempPercent = safeMax > 0 ? Math.min(100, (Math.max(0, temp || 0) / safeMax) * 100) : 0;
  return (
    <div className={`bar-group ${onChange ? "is-adjustable" : ""}`}>
      <div className={`meter meter-${kind || "resource"}`}>
        <span style={{ width: `${percent}%`, background: color }} />
        {onChange && (
          <input
            type="range"
            min={min}
            max={safeMax}
            value={safeValue}
            aria-label={`Ajustar ${label || "recurso"}`}
            onInput={(event) => onChange(Math.min(safeMax, Math.max(min, Number(event.currentTarget.value))))}
          />
        )}
      </div>
      {temp !== undefined && (
        <div className="temp-meter">
          <span className="temp-label"><img className="resource-inline-medallion" src={ASSETS.stats.temporaryHp.src} width={18} height={18} loading="eager" decoding="async" alt="" />PV temporário</span>
          <div><i style={{ width: `${tempPercent}%` }} /></div>
          <b>+{temp}</b>
        </div>
      )}
    </div>
  );
}
