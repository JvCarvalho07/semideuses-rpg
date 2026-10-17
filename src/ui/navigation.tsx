import { useEffect, useState } from "react";
import { ASSETS } from "../assets";

/** Id da seção que está no meio da tela (para destacar a aba certa). */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    const elements = key.split("|").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-40% 0px -55% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [key]);
  return active;
}

/** Verdadeiro quando o elemento já passou por cima da tela (rolou além dele). */
export function useScrolledPast(id: string) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = document.getElementById(id);
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0), { threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id]);
  return past;
}

const TABS = [
  { id: "combate", label: "Combate", icon: () => ASSETS.stats.armor.src },
  { id: "pericias", label: "Perícias", icon: () => ASSETS.sections.skills.src },
  { id: "habilidades", label: "Habilidades", icon: () => ASSETS.sections.abilities.src },
  { id: "equipamentos", label: "Itens", icon: () => ASSETS.equipment.inventory.src },
  { id: "historia", label: "História", icon: () => ASSETS.sections.history.src },
] as const;

export const TAB_SECTION_IDS = ["combate", "pericias", "habilidades", "equipamentos", "efeitos", "historia"];

/** Menu fixo no rodapé do celular. */
export function TabBar({ active }: { active: string }) {
  const current = active === "efeitos" ? "equipamentos" : active;
  return (
    <nav className="tab-bar" aria-label="Seções da ficha">
      {TABS.map((tab) => (
        <a key={tab.id} href={`#${tab.id}`} className={current === tab.id ? "active" : ""} aria-current={current === tab.id ? "true" : undefined}>
          <img src={tab.icon()} width={24} height={24} loading="lazy" decoding="async" alt="" />
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );
}

type DockStat = { label: string; value: number; max: number; onChange: (delta: number) => void };

/** Resumo fixo com PV, MP, CA e o recurso da filiação, que aparece quando o painel de combate sai da tela. */
export function VitalsDock({ visible, hp, mana, resource, armorClass }: { visible: boolean; hp: DockStat; mana: DockStat | null; resource: DockStat | null; armorClass: number }) {
  const stats = [hp, mana, resource].filter((stat): stat is DockStat => !!stat);
  return (
    <div className={`vitals-dock ${visible ? "is-visible" : ""}`} role="region" aria-label="Resumo de combate" aria-hidden={!visible}>
      {stats.map((stat) => (
        <div className="dock-stat" key={stat.label}>
          <button type="button" tabIndex={visible ? 0 : -1} aria-label={`Reduzir ${stat.label}`} onClick={() => stat.onChange(-1)}>−</button>
          <span><small>{stat.label}</small><b>{stat.value}<i>/{stat.max}</i></b></span>
          <button type="button" tabIndex={visible ? 0 : -1} aria-label={`Aumentar ${stat.label}`} onClick={() => stat.onChange(1)}>+</button>
        </div>
      ))}
      <div className="dock-ca"><small>CA</small><b>{armorClass}</b></div>
    </div>
  );
}
