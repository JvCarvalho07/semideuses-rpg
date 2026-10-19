import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ATTRIBUTE_LABELS, FILIATIONS, INITIAL_SHEET, makeId, type AttributeKey, type CharacterSheet } from "./model";
import { BACKGROUNDS, INITIATIVE_BASE_BONUS, clampResource, deriveStats, setEquipped, signed } from "./rules";
import { pathNames } from "./abilitySync";
import { applyBackground, applyIdentity, applyLevel, applyPath, cycleSkill } from "./sheetActions";
import { normalizeImportedSheet } from "./import";
import { ASSETS } from "./assets";
import { EQUIPMENT_TYPES, LEGEND_CHOICES, ORIGIN_SUGGESTIONS, type PrintFormat, RESOURCE_ASSETS } from "./ui/config";
import { equipmentAsset, filiationSeal, initialPrintFormat } from "./ui/format";
import { NumberControl, ResourceBar } from "./ui/meters";
import { prepareAvatar } from "./ui/avatar";
import { AbilityLayout } from "./ui/abilities";
import { EquipmentAdder, EquipmentRow } from "./ui/equipment";
import { Fact } from "./ui/facts";
import { TAB_SECTION_IDS, TabBar, VitalsDock, useActiveSection, useScrolledPast } from "./ui/navigation";
import { EffectsSection } from "./ui/effects";
import { LibraryPanel } from "./ui/library";
import { type Library, findByName, loadLibrary, newSheetId, readSheet, removeSheet, setActive, sortedEntries, writeSheet } from "./library";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function normalizeSheet(candidate: unknown): CharacterSheet {
  return normalizeImportedSheet(candidate).sheet;
}

export default function Home() {
  const [sheet, setSheet] = useState<CharacterSheet>(() => ({ ...INITIAL_SHEET }));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [library, setLibrary] = useState<Library>({ activeId: "", entries: [] });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryRef = useRef(library);
  libraryRef.current = library;
  // Ao abrir uma ficha da lista, não conta como edição (não muda a data dela).
  const skipSaveRef = useRef(false);
  const storageWarnedRef = useRef(false);
  const [importNotice, setImportNotice] = useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");
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
    try {
      const { library: loaded } = loadLibrary(localStorage);
      if (loaded.activeId) {
        const parsed = readSheet(localStorage, loaded.activeId);
        const result = parsed ? normalizeImportedSheet(parsed) : null;
        if (result?.recognized) {
          skipSaveRef.current = true;
          setSheet(result.sheet);
          // Quem já usava a ficha antiga vê o que a migração para a versão 4 ajustou.
          if (Math.floor(Number((parsed as { version?: unknown }).version)) < 4 && result.report.adjustments.length) setImportNotice(result.report.adjustments);
        }
        setLibrary(loaded);
      } else {
        setLibrary({ activeId: newSheetId(), entries: [] });
      }
    } catch {
      setLibrary({ activeId: newSheetId(), entries: [] });
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    try {
      setLibrary(writeSheet(localStorage, libraryRef.current, libraryRef.current.activeId, sheet));
    } catch {
      if (!storageWarnedRef.current) window.alert("O navegador ficou sem espaço para salvar as fichas. Exporte o JSON desta ficha e apague fichas que não usa mais (ou fotos grandes).");
      storageWarnedRef.current = true;
      return;
    }
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
    accent: "#b9863f",
    light: "#e8ca8c",
    deep: "#172d32",
    secondary: "#0e6172",
    mark: "Σ",
  };
  const derived = useMemo(() => deriveStats(sheet), [sheet]);
  const { prof, mods, castingModifier, castingAttackBonus } = derived;
  const hpMax = derived.hpMax.value;
  const manaMax = derived.manaMax.value;
  const { value: armorClass, auto: automaticArmorClass } = derived.armorClass;
  const { value: perception, auto: passivePerception } = derived.perception;
  const { value: initiative } = derived.initiative;
  const { value: speed, auto: automaticSpeed } = derived.speed;
  const { value: castingDc } = derived.castingDc;

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

  function updateVitalMaximum(resource: "hp" | "mana", overrideKey: "hpMaxOverride" | "manaMaxOverride", value: number) {
    const nextMaximum = Math.max(0, Number.isFinite(value) ? value : 0);
    setSheet((current) => ({ ...current, [overrideKey]: nextMaximum, [resource]: Math.min(Math.max(0, current[resource]), nextMaximum) }));
  }

  function resetVitalMaximum(resource: "hp" | "mana", overrideKey: "hpMaxOverride" | "manaMaxOverride") {
    setSheet((current) => {
      const next = { ...current, [overrideKey]: null };
      const max = resource === "hp" ? deriveStats(next).hpMax.value : deriveStats(next).manaMax.value;
      return { ...next, [resource]: Math.min(current[resource], max) };
    });
  }

  function adjustHp(delta: number) {
    setSheet((current) => {
      const max = deriveStats(current).hpMax.value;
      if (delta > 0 && current.hp >= max) return { ...current, hpTemp: Math.max(0, current.hpTemp + delta) };
      if (delta < 0 && current.hpTemp > 0) return { ...current, hpTemp: Math.max(0, current.hpTemp + delta) };
      return { ...current, hp: Math.min(Math.max(0, max), Math.max(0, current.hp + delta)) };
    });
  }

  function adjustMana(delta: number) {
    setSheet((current) => ({ ...current, mana: Math.min(Math.max(0, deriveStats(current).manaMax.value), Math.max(0, current.mana + delta)) }));
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
    const blob = new Blob([JSON.stringify({ ...sheet, hpMax, manaMax, speed, skillRanks: Object.fromEntries(derived.skills.map((skill) => [skill.name, skill.rank])) }, null, 2)], { type: "application/json" });
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
        const twin = findByName(libraryRef.current, result.sheet.name);
        const replace = twin ? window.confirm(`Já existe uma ficha chamada "${twin.name}". OK substitui essa ficha pelo arquivo importado; Cancelar cria uma ficha separada.`) : false;
        storeAndOpen(result.sheet, replace && twin ? twin.id : newSheetId());
        setImportNotice([...result.report.adjustments, ...(result.report.unknownFields.length ? [`Campos desconhecidos preservados: ${result.report.unknownFields.join(", ")}`] : [])]);
      } catch {
        window.alert("Este arquivo não contém uma ficha compatível.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function blankSheet(): CharacterSheet {
    return {
      ...INITIAL_SHEET,
      name: "",
      player: "",
      abilityGroups: { abilities: [], filiation: [], path: [], skills: [], talents: [] },
      equipment: [],
      effects: [],
      personality: { trait: "", ideal: "", bond: "", flaw: "", backgroundTrait: "", backgroundBond: "", appearance: "", history: "", notes: "" },
    };
  }

  /** Grava a ficha com esse id (nova ou substituída) e passa a mostrá-la. */
  function storeAndOpen(next: CharacterSheet, id: string) {
    try {
      setLibrary(writeSheet(localStorage, libraryRef.current, id, next));
    } catch {
      window.alert("O navegador ficou sem espaço para salvar outra ficha. Apague fichas que não usa mais e tente de novo.");
      return;
    }
    skipSaveRef.current = true;
    setSheet(next);
    setImportNotice([]);
    setLibraryOpen(false);
    window.scrollTo({ top: 0 });
  }

  function newSheet() {
    storeAndOpen(blankSheet(), newSheetId());
  }

  function openSheet(id: string) {
    if (id === libraryRef.current.activeId) {
      setLibraryOpen(false);
      return;
    }
    const parsed = readSheet(localStorage, id);
    const result = parsed ? normalizeImportedSheet(parsed) : null;
    if (!result?.recognized) {
      window.alert("Não foi possível abrir esta ficha.");
      return;
    }
    setLibrary(setActive(localStorage, libraryRef.current, id));
    skipSaveRef.current = true;
    setSheet(result.sheet);
    setImportNotice([]);
    setLibraryOpen(false);
    window.scrollTo({ top: 0 });
  }

  function duplicateSheet(id: string) {
    const source = id === libraryRef.current.activeId ? sheet : (() => {
      const parsed = readSheet(localStorage, id);
      const result = parsed ? normalizeImportedSheet(parsed) : null;
      return result?.recognized ? result.sheet : null;
    })();
    if (!source) return;
    storeAndOpen({ ...source, name: `${source.name || "Personagem"} (cópia)` }, newSheetId());
  }

  function deleteSheet(id: string) {
    const entry = libraryRef.current.entries.find((item) => item.id === id);
    const name = entry?.name || "personagem sem nome";
    if (!window.confirm(`Apagar a ficha de ${name}? Isso não pode ser desfeito. Se quiser guardar uma cópia, exporte o JSON antes.`)) return;
    const next = removeSheet(localStorage, libraryRef.current, id);
    if (id !== libraryRef.current.activeId) {
      setLibrary(next);
      return;
    }
    setLibrary(next);
    if (next.activeId) {
      libraryRef.current = { ...next, activeId: "" };
      openSheet(next.activeId);
      setLibraryOpen(true);
    } else {
      libraryRef.current = next;
      storeAndOpen(blankSheet(), newSheetId());
      setLibraryOpen(true);
    }
  }

  function printSheet() {
    setEquipmentFilter("Todos");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  const typeCounts = Object.fromEntries(EQUIPMENT_TYPES.map((type) => [type, sheet.equipment.filter((item) => item.type === type).length]));
  const activeEquipmentFilter = equipmentFilter === "Todos" || typeCounts[equipmentFilter] ? equipmentFilter : "Todos";
  const filteredEquipment = sheet.equipment.filter((item) => {
    const matchesType = activeEquipmentFilter === "Todos" || item.type === activeEquipmentFilter;
    const query = equipmentSearch.trim().toLocaleLowerCase();
    const matchesSearch = !query || [item.name, item.type, item.properties, item.notes, item.attack, item.damage].join(" ").toLocaleLowerCase().includes(query);
    return matchesType && matchesSearch;
  });
  const warningById = new Map(derived.armorWarnings.map((entry) => [sheet.equipment[entry.index].id, entry.message]));
  const equipmentGroups = ([["Equipado agora", true], ["Na mochila", false]] as const)
    .map(([group, equipped]) => ({ group, equipped, items: filteredEquipment.filter((item) => item.equipped === equipped) }))
    .filter(({ items }) => items.length > 0);
  const equippedNames = sheet.equipment.filter((item) => item.equipped).map((item) => item.name || "item sem nome");

  const dockVisible = useScrolledPast("combate");
  const activeSection = useActiveSection(TAB_SECTION_IDS);
  const adjustResource = (delta: number) => setSheet((current) => {
    const resource = deriveStats(current).resource;
    return resource ? { ...current, divineResource: clampResource(current.divineResource + delta, resource) } : current;
  });

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
          <button type="button" className="library-button" onClick={() => setLibraryOpen(true)} aria-haspopup="dialog">Fichas{library.entries.length > 1 && <b>{library.entries.length}</b>}</button>
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
      <LibraryPanel
        open={libraryOpen}
        entries={sortedEntries(library)}
        activeId={library.activeId}
        onClose={() => setLibraryOpen(false)}
        onOpen={openSheet}
        onNew={newSheet}
        onImport={() => importRef.current?.click()}
        onDuplicate={duplicateSheet}
        onDelete={deleteSheet}
      />
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
                <label className="identity-filiation"><span>Filiação</span><div className="filiation-control"><img src={filiationSeal(sheet.filiation).src} width={34} height={34} loading="eager" decoding="async" alt="" /><select value={sheet.filiation} onChange={(event) => {
                  const name = event.target.value;
                  setSheet((current) => applyIdentity(current, { filiation: name }));
                }}>{[<option key="empty" value="">Escolha uma filiação</option>, ...Object.keys(FILIATIONS).map((name) => <option key={name} value={name}>{name}</option>)]}</select></div></label>
                <label className="identity-path"><span>Caminho divino</span><input list="path-options" value={sheet.pathName} onChange={(event) => setSheet((current) => applyPath(current, event.target.value))} /></label>
                <label className="identity-origin"><span>Origem</span><input list="origin-options" placeholder="Ex.: Semideus Grego" value={sheet.origin} onChange={(event) => setSheet((current) => applyIdentity(current, { origin: event.target.value }))} /></label>
                <label className="identity-level"><span>Nível</span><input type="number" min={1} value={sheet.level} onChange={(event) => setSheet((current) => applyLevel(current, Number(event.target.value)))} /></label>
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
              <datalist id="path-options">{pathNames(sheet.filiation).map((name) => <option key={name} value={name} />)}</datalist>
              <datalist id="background-options">{BACKGROUNDS.map((entry) => <option key={entry.name} value={entry.name} />)}</datalist>
              <datalist id="origin-options">{ORIGIN_SUGGESTIONS.map((origin) => <option key={origin} value={origin} />)}</datalist>
              <div className="identity-secondary">
                <label><span>Antecedente</span><input list="background-options" value={sheet.background} onChange={(event) => setSheet((current) => applyBackground(current, event.target.value))} /></label>
                <label><span>Jogador</span><input value={sheet.player} onChange={(event) => patch("player", event.target.value)} /></label>
              </div>
            </div>
          </div>

          <div className="combat-dashboard" id="combate" style={{ "--resource-texture": `url(${RESOURCE_ASSETS.texture})` } as CSSProperties}>
            <section className="vitals-block">
              <div className="vital-row">
                <NumberControl label="PV" value={sheet.hp} max={hpMax} iconSrc={RESOURCE_ASSETS.health} onChange={(value) => patch("hp", Math.min(Math.max(0, value), Math.max(0, hpMax)))} onIncrease={() => adjustHp(1)} onDecrease={() => adjustHp(-1)} onMaxChange={(value) => updateVitalMaximum("hp", "hpMaxOverride", value)} autoMax={derived.hpMax.overridden ? derived.hpMax.auto : null} onResetMax={() => resetVitalMaximum("hp", "hpMaxOverride")} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={hpMax} onChange={(event) => updateVitalMaximum("hp", "hpMaxOverride", Number(event.target.value))} /></label>
                <ResourceBar label="PV" value={sheet.hp} max={hpMax} temp={sheet.hpTemp} color="var(--health)" kind="health" onChange={(value) => patch("hp", value)} />
                <label className="temp-value">Temporário<input type="number" min={0} value={sheet.hpTemp} onChange={(event) => patch("hpTemp", Number(event.target.value))} /></label>
              </div>
              {derived.usesMana || manaMax > 0 ? (
              <div className="vital-row mana-row">
                <NumberControl label="MP" value={sheet.mana} max={manaMax} iconSrc={RESOURCE_ASSETS.mana} onChange={(value) => patch("mana", Math.min(Math.max(0, value), Math.max(0, manaMax)))} onIncrease={() => adjustMana(1)} onDecrease={() => adjustMana(-1)} onMaxChange={(value) => updateVitalMaximum("mana", "manaMaxOverride", value)} autoMax={derived.manaMax.overridden ? derived.manaMax.auto : null} onResetMax={() => resetVitalMaximum("mana", "manaMaxOverride")} />
                <label className="maximum-field">Máximo<input type="number" min={1} value={manaMax} onChange={(event) => updateVitalMaximum("mana", "manaMaxOverride", Number(event.target.value))} /></label>
                <ResourceBar label="MP" value={sheet.mana} max={manaMax} color="var(--mana)" kind="mana" onChange={(value) => patch("mana", value)} />
              </div>
              ) : <p className="resource-note">{derived.kind === "cyclops" || derived.kind === "mortal" ? "Esta origem não usa Mana." : `${sheet.filiation} não usa Mana.`}</p>}
            </section>

            <section className="divine-block" title={derived.resource?.spec.note}>
              {derived.resource ? (
                <>
                  <NumberControl
                    label={derived.resource.spec.name}
                    value={sheet.divineResource}
                    min={derived.resource.min}
                    max={derived.resource.max}
                    iconSrc={RESOURCE_ASSETS.divine}
                    onChange={(value) => patch("divineResource", clampResource(value, derived.resource!))}
                    onIncrease={() => adjustResource(1)}
                    onDecrease={() => adjustResource(-1)}
                    onMaxChange={(value) => patch("resourceMaxOverride", Math.max(derived.resource!.min, value))}
                    autoMax={derived.resource.overridden ? derived.resource.autoMax : null}
                    onResetMax={() => patch("resourceMaxOverride", null)}
                  />
                  <ResourceBar value={sheet.divineResource} min={derived.resource.min} max={derived.resource.max} color="var(--deity)" />
                </>
              ) : (
                <p className="resource-note">{!derived.profile ? "Escolha uma filiação ou uma origem para ver o recurso." : derived.kind === "cyclops" ? "Cíclopes não usam Mana nem contador: os poderes são medidos em usos por Descanso." : `${sheet.filiation || sheet.origin} não usa um contador próprio: as regras estão na Assinatura da filiação.`}</p>
              )}
              <div className="pips-line"><span className="slot-label"><img className="resource-inline-medallion" src={ASSETS.stats.favor.src} width={18} height={18} loading="eager" decoding="async" alt="" />Favor divino</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Favor divino ${value}`} className={value <= sheet.favor ? "on" : ""} onClick={() => patch("favor", sheet.favor === value ? value - 1 : value)} />)}</div></div>
              <div className="pips-line"><span className="slot-label"><img className="resource-inline-medallion" src={ASSETS.stats.sustain.src} width={18} height={18} loading="eager" decoding="async" alt="" />Sustentação</span><div>{[1, 2].map((value) => <button key={value} type="button" aria-label={`Sustentação ${value}`} className={value <= sheet.sustain ? "on" : ""} onClick={() => patch("sustain", sheet.sustain === value ? value - 1 : value)} />)}</div><b>{sheet.sustain}/2</b></div>
            </section>

            <section className="combat-facts">
              <Fact
                label="CA"
                iconSrc={ASSETS.stats.armor.src}
                display={armorClass}
                value={armorClass}
                overridden={sheet.caOverride !== null}
                hint={<>{sheet.caOverride === null ? "automática" : `auto ${automaticArmorClass}`}{derived.effects.ca !== 0 && <> · efeitos {signed(derived.effects.ca)}</>}{sheet.caExtra !== 0 && <> · extra {signed(sheet.caExtra)} <button type="button" className="fact-reset" onClick={() => patch("caExtra", 0)}>zerar</button></>}</>}
                onOverride={(value) => patch("caOverride", value)}
                onReset={() => patch("caOverride", null)}
              />
              <Fact
                label="Iniciativa"
                iconSrc={ASSETS.stats.initiative.src}
                display={signed(initiative)}
                value={initiative}
                overridden={sheet.initiativeOverride !== null}
                hint={<>DES {signed(mods.des)} · Reflexos {signed(INITIATIVE_BASE_BONUS)} · extra {signed(sheet.initiativeExtra)}{derived.effects.initiative !== 0 && <> · efeitos {signed(derived.effects.initiative)}</>}</>}
                extra={<label className="fact-extra"><small>Bônus extra</small><input type="number" value={sheet.initiativeExtra} aria-label="Bônus extra de iniciativa" onFocus={(event) => event.currentTarget.select()} onChange={(event) => patch("initiativeExtra", Number(event.target.value))} /></label>}
                onOverride={(value) => patch("initiativeOverride", value)}
                onReset={() => patch("initiativeOverride", null)}
              />
              <Fact
                label="Deslocamento"
                iconSrc={ASSETS.stats.speed.src}
                display={`${speed} m`}
                value={speed}
                overridden={sheet.speedOverride !== null}
                hint={sheet.speedOverride === null ? "automático" : `auto ${automaticSpeed} m`}
                onOverride={(value) => patch("speedOverride", value)}
                onReset={() => patch("speedOverride", null)}
              />
              <Fact
                label="Percepção"
                iconSrc={ASSETS.stats.perception.src}
                display={perception}
                value={perception}
                overridden={sheet.perceptionOverride !== null}
                hint={sheet.perceptionOverride === null ? "passiva automática" : `auto ${passivePerception}`}
                onOverride={(value) => patch("perceptionOverride", value)}
                onReset={() => patch("perceptionOverride", null)}
              />
              <div className="casting-panel">
                <span className="casting-title"><img src={ASSETS.stats.casting.src} width={24} height={24} loading="lazy" decoding="async" alt="" />Conjuração</span>
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
              <div className="compact-heading"><h2><img className="section-heading-medallion" src={ASSETS.stats.savingThrows.src} width={30} height={30} loading="lazy" decoding="async" alt="" />Testes de resistência</h2><span>proficiência {signed(prof)}</span></div>
              <div>{(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => {
                const trained = sheet.saveProficiencies.includes(key);
                return <button key={key} type="button" className={trained ? "trained" : ""} onClick={() => patch("saveProficiencies", trained ? sheet.saveProficiencies.filter((item) => item !== key) : [...sheet.saveProficiencies, key])}><span>{ATTRIBUTE_LABELS[key]}</span><strong>{signed(mods[key] + (trained ? prof : 0))}</strong></button>;
              })}</div>
            </section>
          </div>
        </section>

        <section className="stats-layout reveal-section" id="pericias">
          <div className="attributes-column">
            <div className="editorial-heading"><h2>Atributos</h2></div>
            {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
              <label className="attribute-line" key={key}>
                <span className="attribute-label"><img src={ASSETS.attributes[key].src} width={24} height={24} loading="lazy" decoding="async" alt="" />{ATTRIBUTE_LABELS[key]}</span>
                <input type="number" min={1} max={30} value={sheet.attributes[key]} onChange={(event) => patch("attributes", { ...sheet.attributes, [key]: Number(event.target.value) })} />
                <strong>{signed(mods[key])}</strong>
              </label>
            ))}
          </div>
          <div className="skills-column">
            {derived.domSkillOptions.length > 0 && <label className="dom-skill">Especialização do Dom<select value={derived.domSkillOptions.includes(sheet.domSkill) ? sheet.domSkill : ""} onChange={(event) => patch("domSkill", event.target.value)}><option value="">Escolha a perícia</option>{derived.domSkillOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
            <div className="editorial-heading with-key"><h2>Perícias</h2><small>filiação e antecedente já aplicados · toque para ajustar</small>{Object.keys(sheet.skillRankOverrides).length > 0 && <button type="button" className="skills-auto" onClick={() => patch("skillRankOverrides", {})}>Perícias automáticas</button>}</div>
            <div className="skills-grid">{derived.skills.map((skill) => (
              <button type="button" className={`skill-entry rank-${skill.rank} ${skill.overridden ? "is-manual" : ""}`} key={skill.name} onClick={() => setSheet((current) => cycleSkill(current, skill.name))} title={skill.overridden ? `Ajuste manual (o livro dá ${skill.autoRank === 2 ? "especialização" : skill.autoRank === 1 ? "proficiência" : "nenhum treino"})` : undefined}><i /><span>{skill.name}<small>{ATTRIBUTE_LABELS[skill.attribute]}{skill.overridden ? " · manual" : ""}</small></span><strong>{signed(skill.bonus)}</strong></button>
            ))}</div>
          </div>
        </section>

        <section className="abilities-section reveal-section" id="habilidades">
          <div className="section-toolbar abilities-toolbar">
            <h2><img className="section-heading-medallion" src={ASSETS.sections.abilities.src} width={34} height={34} loading="lazy" decoding="async" alt="" />Habilidades</h2>
            <div className="ability-toolbar-controls">
              <label className="ability-search"><span className="sr-only">Buscar habilidades</span><input value={abilitySearch} placeholder="Buscar por nome, custo ou ação" onChange={(event) => setAbilitySearch(event.target.value)} /></label>
              <label className="ability-filter"><span className="sr-only">Filtrar categoria</span><select value={abilityCategoryFilter} onChange={(event) => setAbilityCategoryFilter(event.target.value)}><option>Todas</option><option value="abilities">Gerais</option><option value="path">Caminho</option><option value="skills">Skills</option><option value="filiation">Filiação</option><option value="talents">Talentos</option></select></label>
              <label className="ability-filter"><span className="sr-only">Filtrar ação</span><select value={abilityActionFilter} onChange={(event) => setAbilityActionFilter(event.target.value)}><option value="">Todas as ações</option><option>Passiva</option><option>Ação</option><option>Ação Bônus</option><option>Reação</option></select></label>
              <button type="button" className="ability-expand-toggle" onClick={() => setAbilityExpandAll(abilityExpandAll === true ? false : true)}>{abilityExpandAll === true ? "Recolher tudo" : "Expandir tudo"}</button>
            </div>
          </div>
          <AbilityLayout sheet={sheet} resource={derived.resource} compact={compactViewport} search={abilitySearch} actionFilter={abilityActionFilter} categoryFilter={abilityCategoryFilter} expandAll={abilityExpandAll} onChange={(updater) => setSheet(updater)} />
        </section>

        <section className="equipment-section reveal-section" id="equipamentos">
          <div className="section-toolbar equipment-toolbar">
            <h2><img className="section-heading-medallion" src={ASSETS.equipment.inventory.src} width={34} height={34} loading="lazy" decoding="async" alt="" />Equipamentos</h2>
            <div className="equipment-actions">
              <label className="currency-field">
                <span><img className="currency-medallion" src={ASSETS.currency.dracma.src} width={42} height={42} loading="lazy" decoding="async" alt="" /><b>Dracmas</b></span>
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
                <span><img className="currency-medallion currency-medallion-small" src={ASSETS.currency.human.src} width={34} height={34} loading="lazy" decoding="async" alt="" /><b>Dinheiro humano</b></span>
                <div><input className="currency-symbol-input" aria-label="Símbolo do dinheiro humano" value={sheet.humanMoneyCurrency} maxLength={4} onChange={(event) => patch("humanMoneyCurrency", event.target.value)} /><input type="number" min={0} inputMode="decimal" value={sheet.humanMoney} onChange={(event) => patch("humanMoney", Math.max(0, Number(event.target.value)))} /></div>
              </label>
              <div className="currency-print print-only"><span>Dinheiro humano</span><strong>{sheet.humanMoneyCurrency} {sheet.humanMoney}</strong></div>
            </div>
          </div>
          <div className="equipment-workspace">
            <div className="equipment-summary">
              <div className="equipment-ac-summary"><span>CA</span><strong>{armorClass}</strong></div>
              <p><b>Equipado agora:</b> {equippedNames.length ? equippedNames.join(", ") : "nada. Use o botão Equipar nos itens abaixo."}</p>
            </div>
            <EquipmentAdder onAdd={(item) => patch("equipment", [...sheet.equipment, item])} />
            <div className="equipment-control-row">
              <label className="equipment-search"><span className="sr-only">Buscar equipamentos</span><input value={equipmentSearch} placeholder="Buscar pelo nome, dano ou propriedade" onChange={(event) => setEquipmentSearch(event.target.value)} /></label>
              {sheet.equipment.length > 0 && <div className="equipment-filters" aria-label="Tipos de equipamento">{["Todos", ...EQUIPMENT_TYPES.filter((type) => typeCounts[type])].map((type) => <button type="button" key={type} className={activeEquipmentFilter === type ? "active" : ""} onClick={() => setEquipmentFilter(type)}><img src={(type === "Todos" ? ASSETS.sections.abilities : equipmentAsset(type)).src} width={24} height={24} loading="lazy" decoding="async" alt="" />{type} <small>{type === "Todos" ? sheet.equipment.length : typeCounts[type]}</small></button>)}</div>}
            </div>
            <div className="equipment-groups">
              {sheet.equipment.length === 0 && <p className="empty-state equipment-empty-state"><img src={ASSETS.equipment.inventory.src} width={38} height={38} loading="lazy" decoding="async" alt="" />Sua mochila está vazia. Escolha uma arma, armadura ou escudo do livro acima, ou crie um item em branco.</p>}
              {sheet.equipment.length > 0 && equipmentGroups.length === 0 && <p className="empty-state equipment-empty-state">Nenhum item corresponde à busca. Limpe o texto ou escolha outra categoria.</p>}
              {equipmentGroups.map(({ group, equipped, items }) => <section className="equipment-group" key={group}><header><h3><img className="group-medallion" src={(equipped ? ASSETS.equipment.equipped : ASSETS.equipment.inventory).src} width={26} height={26} loading="lazy" decoding="async" alt="" />{group}</h3><span>{items.length}</span></header><div className="equipment-list">{items.map((item) => <EquipmentRow key={item.id} item={item} warning={warningById.get(item.id)} onUpdate={(updated) => patch("equipment", sheet.equipment.map((current) => current.id === item.id ? updated : current))} onToggleEquipped={(next) => patch("equipment", setEquipped(sheet.equipment, item.id, next))} onRemove={() => patch("equipment", sheet.equipment.filter((current) => current.id !== item.id))} />)}</div></section>)}
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

        <EffectsSection effects={sheet.effects} onChange={(effects) => patch("effects", effects)} />

        <section className="story-section reveal-section" id="historia">
          <div className="section-toolbar"><h2><img className="section-heading-medallion" src={ASSETS.sections.history.src} width={34} height={34} loading="lazy" decoding="async" alt="" />História e traços</h2></div>
          <div className="personality-grid">
            <label><span>Traço</span><textarea value={sheet.personality.trait} onChange={(event) => patchPersonality("trait", event.target.value)} /><div className="print-value print-only">{sheet.personality.trait || "—"}</div></label>
            <label><span>Ideal</span><textarea value={sheet.personality.ideal} onChange={(event) => patchPersonality("ideal", event.target.value)} /><div className="print-value print-only">{sheet.personality.ideal || "—"}</div></label>
            <label><span>Vínculo</span><textarea value={sheet.personality.bond} onChange={(event) => patchPersonality("bond", event.target.value)} /><div className="print-value print-only">{sheet.personality.bond || "—"}</div></label>
            <label><span>Falha</span><textarea value={sheet.personality.flaw} onChange={(event) => patchPersonality("flaw", event.target.value)} /><div className="print-value print-only">{sheet.personality.flaw || "—"}</div></label>
            <label><span>Traço do antecedente</span><textarea value={sheet.personality.backgroundTrait} onChange={(event) => patchPersonality("backgroundTrait", event.target.value)} /><div className="print-value print-only">{sheet.personality.backgroundTrait || "—"}</div></label>
            <label><span>Vínculo do antecedente</span><textarea value={sheet.personality.backgroundBond} onChange={(event) => patchPersonality("backgroundBond", event.target.value)} /><div className="print-value print-only">{sheet.personality.backgroundBond || "—"}</div></label>
            <label className="wide"><span>Aparência</span><textarea value={sheet.personality.appearance} onChange={(event) => patchPersonality("appearance", event.target.value)} /><div className="print-value print-only">{sheet.personality.appearance || "—"}</div></label>
            <label className="tall"><span className="narrative-label"><img src={ASSETS.sections.history.src} width={24} height={24} loading="lazy" decoding="async" alt="" />História</span><textarea value={sheet.personality.history} onChange={(event) => patchPersonality("history", event.target.value)} /><div className="print-value print-only">{sheet.personality.history || "—"}</div></label>
            <label className="tall"><span className="narrative-label"><img src={ASSETS.sections.notes.src} width={24} height={24} loading="lazy" decoding="async" alt="" />Notas</span><textarea value={sheet.personality.notes} onChange={(event) => patchPersonality("notes", event.target.value)} /><div className="print-value print-only">{sheet.personality.notes || "—"}</div></label>
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
      <VitalsDock
        visible={dockVisible}
        hp={{ label: "PV", value: sheet.hp, max: hpMax, onChange: adjustHp }}
        mana={derived.usesMana || manaMax > 0 ? { label: "MP", value: sheet.mana, max: manaMax, onChange: adjustMana } : null}
        resource={derived.resource ? { label: derived.resource.spec.name, value: sheet.divineResource, max: derived.resource.max, onChange: adjustResource } : null}
        armorClass={armorClass}
      />
      <TabBar active={activeSection} />
    </main>
  );
}
