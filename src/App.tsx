import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
} from "./model";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ABILITY_ORDER = Object.keys(ABILITY_META) as AbilityCategory[];
const EQUIPMENT_TYPES = ["Arma", "Armadura", "Escudo", "Ferramenta", "Acessório", "Relíquia", "Consumível", "Outro"];
const ORIGIN_SUGGESTIONS = ["Semideus Grego", "Sátiro", "Ciclope", "Mortal Vidente", "Legado"];
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

function proficiency(level: number) {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

function NumberControl({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="number-control">
      <span>{label}</span>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Reduzir ${label}`}>−</button>
      <strong>{value}</strong>
      <small>/ {max}</small>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Aumentar ${label}`}>+</button>
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
}: {
  value: number;
  max: number;
  color: string;
  temp?: number;
  label?: string;
  onChange?: (value: number) => void;
}) {
  const percent = Math.min(100, (value / Math.max(max, 1)) * 100);
  const tempPercent = Math.min(100, ((temp || 0) / Math.max(max, 1)) * 100);
  return (
    <div className={`bar-group ${onChange ? "is-adjustable" : ""}`}>
      <div className="meter">
        <span style={{ width: `${percent}%`, background: color }} />
        {onChange && (
          <input
            type="range"
            min={0}
            max={Math.max(max, 0)}
            value={Math.min(value, Math.max(max, 0))}
            aria-label={`Ajustar ${label || "recurso"}`}
            onInput={(event) => onChange(Number(event.currentTarget.value))}
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
}: {
  ability: Ability;
  onUpdate: (ability: Ability) => void;
  onRemove: () => void;
}) {
  const update = (key: keyof Ability, value: string | number) => onUpdate({ ...ability, [key]: value });
  return (
    <div className="ability-unit">
      <details className="ability-card" open={!ability.name || undefined}>
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

function AbilitySection({
  category,
  items,
  onChange,
}: {
  category: AbilityCategory;
  items: Ability[];
  onChange: (items: Ability[]) => void;
}) {
  const meta = ABILITY_META[category];
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
        <span>{items.length}</span>
        <button type="button" onClick={add}>Adicionar</button>
      </div>
      <div className="ability-list">
        {items.length === 0 && <p className="empty-state">Vazio.</p>}
        {items.map((item) => (
          <AbilityEditor
            key={item.id}
            ability={item}
            onUpdate={(updated) => onChange(items.map((current) => current.id === item.id ? updated : current))}
            onRemove={() => onChange(items.filter((current) => current.id !== item.id))}
          />
        ))}
      </div>
    </section>
  );
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
        <span className="equipment-symbol">{item.type.slice(0, 2).toUpperCase()}</span>
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

function normalizeSheet(candidate: CharacterSheet): CharacterSheet {
  const { race: legacyRace, ...sheetWithoutLegacyRace } = candidate as CharacterSheet & { race?: string };
  const rawGroups = candidate.abilityGroups as Partial<Record<AbilityCategory | "legend", Ability[]>>;
  const legacyLegendEntries = candidate.legacyLegendEntries?.length
    ? candidate.legacyLegendEntries
    : rawGroups.legend;
  return {
    ...sheetWithoutLegacyRace,
    version: 2,
    avatarDataUrl: candidate.avatarDataUrl || "",
    origin: candidate.origin || legacyRace || "",
    legendDestiny: candidate.legendDestiny || "",
    legacyLegendEntries: legacyLegendEntries?.length ? legacyLegendEntries : undefined,
    castingDcOverride: Number.isFinite(candidate.castingDcOverride)
      ? Number(candidate.castingDcOverride)
      : null,
    dracmas: Math.max(0, Number(candidate.dracmas ?? 0)),
    abilityGroups: {
      abilities: rawGroups.abilities || [],
      filiation: rawGroups.filiation || [],
      path: rawGroups.path || [],
      skills: rawGroups.skills || [],
      talents: rawGroups.talents || [],
    },
  };
}

export default function Home() {
  const [sheet, setSheet] = useState<CharacterSheet>(() => ({ ...INITIAL_SHEET }));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");
  const [legendOpen, setLegendOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);

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
      const parsed = JSON.parse(stored) as CharacterSheet;
      if (parsed.version === 2) setSheet(normalizeSheet(parsed));
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
  const armorClass = armorBase + equipmentBonus + sheet.caExtra;
  const passivePerception = 10 + mods.sab + prof * (sheet.skillRanks.Percepção || 0);
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
        const imported = JSON.parse(String(reader.result)) as CharacterSheet;
        if (!imported.attributes || !imported.abilityGroups || !imported.equipment || !imported.personality) throw new Error("Formato inválido");
        setSheet(normalizeSheet(imported));
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

  const filteredEquipment = equipmentFilter === "Todos"
    ? sheet.equipment
    : sheet.equipment.filter((item) => item.type === equipmentFilter);

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
          <button type="button" className="primary-action" onClick={printSheet}>PDF</button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJson} />
        </div>
      </header>

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
                : <span aria-hidden="true">{sheet.name.slice(0, 1) || "Σ"}</span>}
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
                  setSheet((current) => ({ ...current, filiation: name, divineResource: selected ? Math.min(current.divineResource, selected.max) : 0 }));
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

          <div className="combat-dashboard" id="combate">
            <section className="vitals-block">
              <div className="vital-row">
                <NumberControl label="PV" value={sheet.hp} max={sheet.hpMax} onChange={(value) => patch("hp", value)} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={sheet.hpMax} onChange={(event) => patch("hpMax", Number(event.target.value))} /></label>
                <ResourceBar label="PV" value={sheet.hp} max={sheet.hpMax} temp={sheet.hpTemp} color="var(--health)" onChange={(value) => patch("hp", value)} />
                <label className="temp-value">Temporário<input type="number" min={0} value={sheet.hpTemp} onChange={(event) => patch("hpTemp", Number(event.target.value))} /></label>
              </div>
              <div className="vital-row mana-row">
                <NumberControl label="MP" value={sheet.mana} max={sheet.manaMax} onChange={(value) => patch("mana", value)} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={sheet.manaMax} onChange={(event) => patch("manaMax", Number(event.target.value))} /></label>
                <ResourceBar label="MP" value={sheet.mana} max={sheet.manaMax} color="var(--mana)" onChange={(value) => patch("mana", value)} />
              </div>
            </section>

            <section className="divine-block">
              <NumberControl label={filiation.resource} value={sheet.divineResource} max={filiation.max} onChange={(value) => patch("divineResource", value)} />
              <ResourceBar value={sheet.divineResource} max={filiation.max} color="var(--deity)" />
              <div className="pips-line"><span>Favor divino</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Favor divino ${value}`} className={value <= sheet.favor ? "on" : ""} onClick={() => patch("favor", sheet.favor === value ? value - 1 : value)} />)}</div></div>
              <div className="pips-line"><span>Sustentação</span><div>{[1, 2].map((value) => <button key={value} type="button" aria-label={`Sustentação ${value}`} className={value <= sheet.sustain ? "on" : ""} onClick={() => patch("sustain", sheet.sustain === value ? value - 1 : value)} />)}</div><b>{sheet.sustain}/2</b></div>
            </section>

            <section className="combat-facts">
              <div><span>CA</span><strong>{armorClass}</strong><small>{armorBase} base + {equipmentBonus + sheet.caExtra}</small></div>
              <div className="initiative-fact">
                <span>Iniciativa</span>
                <div>
                  <strong>{signed(mods.des + sheet.initiativeExtra)}</strong>
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
              <div><span>Deslocamento</span><strong>{sheet.speed} m</strong></div>
              <div><span>Percepção</span><strong>{passivePerception}</strong><small>passiva</small></div>
              <div className="casting-panel">
                <span className="casting-title">Conjuração</span>
                <div className="casting-grid">
                  <label className="casting-attribute">
                    <small>Atributo</small>
                    <select value={sheet.castingAttribute} onChange={(event) => patch("castingAttribute", event.target.value as AttributeKey)}>
                      {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
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
          <div className="section-toolbar"><h2>Habilidades</h2></div>
          <div className="ability-categories">
            {ABILITY_ORDER.map((category) => (
              <AbilitySection
                key={category}
                category={category}
                items={sheet.abilityGroups[category]}
                onChange={(items) => patch("abilityGroups", { ...sheet.abilityGroups, [category]: items })}
              />
            ))}
          </div>
        </section>

        <section className="equipment-section reveal-section" id="equipamentos">
          <div className="section-toolbar equipment-toolbar">
            <h2>Equipamentos</h2>
            <div className="equipment-actions">
              <label className="currency-field">
                <span>Dracmas</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={sheet.dracmas}
                  onChange={(event) => patch("dracmas", Math.max(0, Number(event.target.value)))}
                />
              </label>
              <button type="button" className="large-add" onClick={() => patch("equipment", [...sheet.equipment, { id: makeId("eq"), name: "", type: "Outro", quantity: 1, equipped: false, armorClass: 0, attack: "", damage: "", properties: "", notes: "" }])}>Adicionar equipamento</button>
            </div>
          </div>
          <div className="equipment-workspace">
            <div className="equipment-filters">{["Todos", ...EQUIPMENT_TYPES].map((type) => <button type="button" key={type} className={equipmentFilter === type ? "active" : ""} onClick={() => setEquipmentFilter(type)}>{type}</button>)}</div>
            <div className="equipment-list">
              {filteredEquipment.length === 0 && <p className="empty-state">Nenhum equipamento deste tipo.</p>}
              {filteredEquipment.map((item) => (
                <EquipmentEditor
                  key={item.id}
                  item={item}
                  onUpdate={(updated) => patch("equipment", sheet.equipment.map((current) => current.id === item.id ? updated : current))}
                  onRemove={() => patch("equipment", sheet.equipment.filter((current) => current.id !== item.id))}
                />
              ))}
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
