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
}: {
  value: number;
  max: number;
  color: string;
  temp?: number;
}) {
  const percent = Math.min(100, (value / Math.max(max, 1)) * 100);
  const tempPercent = Math.min(100, ((temp || 0) / Math.max(max, 1)) * 100);
  return (
    <div className="bar-group">
      <div className="meter"><span style={{ width: `${percent}%`, background: color }} /></div>
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
          <p>{meta.description}</p>
        </div>
        <span>{items.length}</span>
        <button type="button" onClick={add}>Adicionar</button>
      </div>
      <div className="ability-list">
        {items.length === 0 && <p className="empty-state">Nenhum item nesta categoria.</p>}
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

export default function Home() {
  const [sheet, setSheet] = useState<CharacterSheet>(() => ({ ...INITIAL_SHEET }));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");
  const importRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".hero-shell", { opacity: 0, y: 28, duration: 0.75, ease: "power3.out" });
    gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
      gsap.from(section, {
        opacity: 0,
        y: 42,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 88%", once: true },
      });
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
      if (parsed.version === 2) setSheet(parsed);
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

  const filiation = FILIATIONS[sheet.filiation as keyof typeof FILIATIONS] || { resource: "Recurso da filiação", max: 10, accent: "#826c4a", light: "#d6b77c" };
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

  const rootStyle = {
    "--deity": filiation.accent,
    "--deity-light": filiation.light,
  } as React.CSSProperties;

  function patch<K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) {
    setSheet((current) => ({ ...current, [key]: value }));
  }

  function patchPersonality(key: keyof CharacterSheet["personality"], value: string) {
    setSheet((current) => ({ ...current, personality: { ...current.personality, [key]: value } }));
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
        setSheet({ ...imported, version: 2 });
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

  const filteredEquipment = equipmentFilter === "Todos"
    ? sheet.equipment
    : sheet.equipment.filter((item) => item.type === equipmentFilter);

  return (
    <main className="app-shell" style={rootStyle} ref={rootRef}>
      <header className="app-nav">
        <a className="wordmark" href="#inicio"><span>Σ</span><b>SEMIDEUSES</b><small>3ª edição</small></a>
        <nav><a href="#combate">Combate</a><a href="#habilidades">Habilidades</a><a href="#equipamentos">Equipamentos</a><a href="#historia">História</a></nav>
        <div className="document-actions">
          <span className={saved ? "save-visible" : ""}>Salvo</span>
          <button type="button" onClick={newSheet}>Nova</button>
          <button type="button" onClick={() => importRef.current?.click()}>Importar</button>
          <button type="button" onClick={exportJson}>JSON</button>
          <button type="button" className="primary-action" onClick={() => window.print()}>PDF</button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJson} />
        </div>
      </header>

      <div className="deity-rail" aria-hidden="true">
        <div>{Object.keys(FILIATIONS).map((name) => <span key={name}>{name}</span>)}</div>
      </div>

      <div className="site-content" id="inicio">
        <section className="hero-shell">
          <div className="hero-identity">
            <div className="portrait-frame"><span>{sheet.name.slice(0, 1) || "Σ"}</span><small>FICHA DIGITAL</small></div>
            <div className="identity-fields">
              <label className="name-field"><span>Nome do herói</span><input value={sheet.name} onChange={(event) => patch("name", event.target.value)} /></label>
              <div className="identity-row">
                <label><span>Filiação</span><select value={sheet.filiation} onChange={(event) => {
                  const name = event.target.value;
                  patch("filiation", name);
                  setSheet((current) => ({ ...current, filiation: name, divineResource: Math.min(current.divineResource, FILIATIONS[name as keyof typeof FILIATIONS].max) }));
                }}>{[<option key="empty" value="">Escolha uma filiação</option>, ...Object.keys(FILIATIONS).map((name) => <option key={name} value={name}>{name}</option>)]}</select></label>
                <label><span>Caminho</span><input value={sheet.pathName} onChange={(event) => patch("pathName", event.target.value)} /></label>
                <label><span>Nível</span><input type="number" min={1} max={20} value={sheet.level} onChange={(event) => patch("level", Number(event.target.value))} /></label>
              </div>
              <div className="identity-secondary">
                <label><span>Origem</span><input value={sheet.origin} onChange={(event) => patch("origin", event.target.value)} /></label>
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
                <ResourceBar value={sheet.hp} max={sheet.hpMax} temp={sheet.hpTemp} color="var(--health)" />
                <label className="temp-value">Temporário<input type="number" min={0} value={sheet.hpTemp} onChange={(event) => patch("hpTemp", Number(event.target.value))} /></label>
              </div>
              <div className="vital-row mana-row">
                <NumberControl label="MP" value={sheet.mana} max={sheet.manaMax} onChange={(value) => patch("mana", value)} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={sheet.manaMax} onChange={(event) => patch("manaMax", Number(event.target.value))} /></label>
                <ResourceBar value={sheet.mana} max={sheet.manaMax} color="var(--mana)" />
              </div>
            </section>

            <section className="divine-block">
              <NumberControl label={filiation.resource} value={sheet.divineResource} max={filiation.max} onChange={(value) => patch("divineResource", value)} />
              <ResourceBar value={sheet.divineResource} max={filiation.max} color="var(--deity)" />
              <div className="pips-line"><span>Favor divino</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= sheet.favor ? "on" : ""} onClick={() => patch("favor", sheet.favor === value ? value - 1 : value)} />)}</div></div>
              <div className="pips-line"><span>Sustentação</span><div>{[1, 2].map((value) => <button key={value} type="button" className={value <= sheet.sustain ? "on" : ""} onClick={() => patch("sustain", sheet.sustain === value ? value - 1 : value)} />)}</div><b>{sheet.sustain}/2</b></div>
            </section>

            <section className="combat-facts">
              <div><span>CA</span><strong>{armorClass}</strong><small>{armorBase} base + {equipmentBonus + sheet.caExtra}</small></div>
              <div><span>Iniciativa</span><strong>{signed(mods.des + sheet.initiativeExtra)}</strong></div>
              <div><span>Deslocamento</span><strong>{sheet.speed} m</strong></div>
              <div><span>Percepção</span><strong>{passivePerception}</strong><small>passiva</small></div>
              <label><span>Conjuração</span><select value={sheet.castingAttribute} onChange={(event) => patch("castingAttribute", event.target.value as AttributeKey)}>{Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><strong>{signed(mods[sheet.castingAttribute])}</strong></label>
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
            <div className="editorial-heading"><span>Base</span><h2>Atributos</h2></div>
            {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
              <label className="attribute-line" key={key}>
                <span>{ATTRIBUTE_LABELS[key]}</span>
                <input type="number" min={1} max={30} value={sheet.attributes[key]} onChange={(event) => patch("attributes", { ...sheet.attributes, [key]: Number(event.target.value) })} />
                <strong>{signed(mods[key])}</strong>
              </label>
            ))}
          </div>
          <div className="skills-column">
            <div className="editorial-heading with-key"><div><span>Toque para alternar</span><h2>Perícias</h2></div><small>vazio · proficiente · especialista</small></div>
            <div className="skills-grid">{SKILLS.map(([name, key]) => {
              const rank = sheet.skillRanks[name] || 0;
              return <button type="button" className={`skill-entry rank-${rank}`} key={name} onClick={() => patch("skillRanks", { ...sheet.skillRanks, [name]: (rank + 1) % 3 })}><i /><span>{name}<small>{ATTRIBUTE_LABELS[key]}</small></span><strong>{signed(mods[key] + prof * rank)}</strong></button>;
            })}</div>
          </div>
        </section>

        <section className="abilities-section reveal-section" id="habilidades">
          <div className="section-intro">
            <span>Arquivo de poder</span>
            <h2>Tudo em seu lugar.</h2>
            <p>Cada origem de poder tem sua própria área, com custos, alcance, duração e recarga visíveis.</p>
          </div>
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
          <div className="section-intro equipment-intro">
            <span>Inventário vivo</span>
            <h2>Equipar muda a ficha.</h2>
            <p>Armaduras, escudos e bônus equipados entram automaticamente no cálculo da CA.</p>
            <button type="button" className="large-add" onClick={() => patch("equipment", [...sheet.equipment, { id: makeId("eq"), name: "", type: "Outro", quantity: 1, equipped: false, armorClass: 0, attack: "", damage: "", properties: "", notes: "" }])}>Adicionar equipamento</button>
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
          </div>
        </section>

        <section className="story-section reveal-section" id="historia">
          <div className="section-intro"><span>Identidade</span><h2>Quem existe além dos números.</h2><p>Antecedente, personalidade e história permanecem juntos no site e no PDF.</p></div>
          <div className="personality-grid">
            <label><span>Traço</span><textarea value={sheet.personality.trait} onChange={(event) => patchPersonality("trait", event.target.value)} /></label>
            <label><span>Ideal</span><textarea value={sheet.personality.ideal} onChange={(event) => patchPersonality("ideal", event.target.value)} /></label>
            <label><span>Vínculo</span><textarea value={sheet.personality.bond} onChange={(event) => patchPersonality("bond", event.target.value)} /></label>
            <label><span>Falha</span><textarea value={sheet.personality.flaw} onChange={(event) => patchPersonality("flaw", event.target.value)} /></label>
            <label><span>Traço do antecedente</span><textarea value={sheet.personality.backgroundTrait} onChange={(event) => patchPersonality("backgroundTrait", event.target.value)} /></label>
            <label><span>Vínculo do antecedente</span><textarea value={sheet.personality.backgroundBond} onChange={(event) => patchPersonality("backgroundBond", event.target.value)} /></label>
            <label className="wide"><span>Aparência</span><textarea value={sheet.personality.appearance} onChange={(event) => patchPersonality("appearance", event.target.value)} /></label>
            <label className="wide tall"><span>História</span><textarea value={sheet.personality.history} onChange={(event) => patchPersonality("history", event.target.value)} /></label>
            <label className="wide tall"><span>Notas</span><textarea value={sheet.personality.notes} onChange={(event) => patchPersonality("notes", event.target.value)} /></label>
          </div>
        </section>
      </div>

      <footer><div><span>Σ</span><strong>{sheet.name}</strong><small>{sheet.filiation} · {sheet.pathName} · nível {sheet.level}</small></div><p>Seus dados ficam salvos neste dispositivo. Exporte o JSON para compartilhar ou guardar uma cópia.</p></footer>
    </main>
  );
}
