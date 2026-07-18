"use client";

import { useEffect, useMemo, useState } from "react";

type Game = {
  slug: string;
  title: string;
  kicker: string;
  date: string;
  dateLabel: string;
  platforms: string[];
  genre: string;
  issue: string;
  accent: string;
  ink: string;
  source: string;
};

const GAMES: Game[] = [
  {
    slug: "halo-campaign-evolved",
    title: "HALO: CAMPAIGN EVOLVED",
    kicker: "A missão recomeça",
    date: "2026-07-28T00:00:00-03:00",
    dateLabel: "28 JUL 2026",
    platforms: ["Xbox", "PC", "PS5"],
    genre: "FPS",
    issue: "RG.026",
    accent: "#b8ff32",
    ink: "#10170b",
    source: "https://news.xbox.com/en-us/2026/06/07/xbox-games-showcase-2026-recap-everything-announced/",
  },
  {
    slug: "marvel-tokon-fighting-souls",
    title: "MARVEL TŌKON: FIGHTING SOULS",
    kicker: "Oito entram. Só um time domina.",
    date: "2026-08-06T00:00:00-03:00",
    dateLabel: "06 AGO 2026",
    platforms: ["PS5", "PC"],
    genre: "Luta",
    issue: "RG.027",
    accent: "#ff4a2f",
    ink: "#1a0703",
    source: "https://blog.playstation.com/2026/07/14/19-unmissable-ps5-games-still-releasing-in-2026/",
  },
  {
    slug: "resonance-a-plague-tale-legacy",
    title: "RESONANCE: A PLAGUE TALE LEGACY",
    kicker: "A ilha guarda o que a história enterrou",
    date: "2026-08-27T00:00:00-03:00",
    dateLabel: "27 AGO 2026",
    platforms: ["PS5", "Xbox", "PC"],
    genre: "Aventura",
    issue: "RG.028",
    accent: "#ffbf3f",
    ink: "#181006",
    source: "https://blog.playstation.com/2026/07/14/19-unmissable-ps5-games-still-releasing-in-2026/",
  },
  {
    slug: "star-wars-zero-company",
    title: "STAR WARS ZERO COMPANY",
    kicker: "Uma companhia. Nenhuma margem para erro.",
    date: "2026-08-27T00:00:00-03:00",
    dateLabel: "27 AGO 2026",
    platforms: ["PS5", "Xbox", "PC"],
    genre: "Estratégia",
    issue: "RG.029",
    accent: "#62d9ff",
    ink: "#05151c",
    source: "https://blog.playstation.com/2026/07/14/19-unmissable-ps5-games-still-releasing-in-2026/",
  },
  {
    slug: "gears-of-war-e-day",
    title: "GEARS OF WAR: E-DAY",
    kicker: "O dia em que o mundo caiu",
    date: "2026-10-06T00:00:00-03:00",
    dateLabel: "06 OUT 2026",
    platforms: ["Xbox", "PC"],
    genre: "Ação",
    issue: "RG.030",
    accent: "#ff3e28",
    ink: "#1a0503",
    source: "https://news.xbox.com/en-us/2026/06/08/gears-of-war-e-day-collectors-edition-xbox-games-showcase-2026/",
  },
  {
    slug: "castlevania-belmonts-curse",
    title: "CASTLEVANIA: BELMONT'S CURSE",
    kicker: "Paris sangra. A maldição desperta.",
    date: "2026-10-15T00:00:00-03:00",
    dateLabel: "15 OUT 2026",
    platforms: ["Xbox", "PC"],
    genre: "Ação",
    issue: "RG.031",
    accent: "#d5a9ff",
    ink: "#120a18",
    source: "https://news.xbox.com/en-us/2026/06/07/xbox-games-showcase-2026-recap-everything-announced/",
  },
  {
    slug: "phantom-blade-zero",
    title: "PHANTOM BLADE ZERO",
    kicker: "Sessenta e seis dias para viver",
    date: "2026-10-29T00:00:00-03:00",
    dateLabel: "29 OUT 2026",
    platforms: ["PS5", "PC"],
    genre: "RPG de ação",
    issue: "RG.032",
    accent: "#e2e2d8",
    ink: "#10100e",
    source: "https://blog.playstation.com/2026/06/02/state-of-play-june-2026-all-announcements-trailers/",
  },
  {
    slug: "grand-theft-auto-vi",
    title: "GRAND THEFT AUTO VI",
    kicker: "Vice City está chamando",
    date: "2026-11-19T00:00:00-03:00",
    dateLabel: "19 NOV 2026",
    platforms: ["PS5", "Xbox"],
    genre: "Mundo aberto",
    issue: "RG.033",
    accent: "#ff5cbd",
    ink: "#1d0716",
    source: "https://www.rockstargames.com/VI/",
  },
  {
    slug: "moss-the-forgotten-relic",
    title: "MOSS: THE FORGOTTEN RELIC",
    kicker: "Já disponível",
    date: "2026-07-16T00:00:00-03:00",
    dateLabel: "16 JUL 2026",
    platforms: ["PS5"],
    genre: "Aventura",
    issue: "RG.025",
    accent: "#7bdc91",
    ink: "#07160b",
    source: "https://blog.playstation.com/2026/",
  },
];

const FILTERS = ["Todos", "PS5", "Xbox", "PC"];

function getRemaining(date: string, now: number) {
  const distance = Math.max(0, new Date(date).getTime() - now);
  return {
    launched: distance === 0,
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function RadarClient() {
  const [now, setNow] = useState(() => Date.now());
  const [activeSlug, setActiveSlug] = useState(GAMES[0].slug);
  const [filter, setFilter] = useState("Todos");
  const [shareLabel, setShareLabel] = useState("Compartilhar countdown");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("jogo");
    if (fromUrl && GAMES.some((game) => game.slug === fromUrl)) setActiveSlug(fromUrl);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const active = GAMES.find((game) => game.slug === activeSlug) ?? GAMES[0];
  const remaining = getRemaining(active.date, now);
  const filtered = useMemo(
    () => GAMES.filter((game) => filter === "Todos" || game.platforms.includes(filter)),
    [filter],
  );

  function selectGame(slug: string) {
    setActiveSlug(slug);
    const url = new URL(window.location.href);
    url.searchParams.set("jogo", slug);
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set("jogo", active.slug);
    const data = {
      title: `${active.title} — Radar Gamer BR`,
      text: remaining.launched
        ? `${active.title} já lançou. Você já jogou?`
        : `Faltam ${remaining.days} dias para ${active.title}. Manda pro seu duo.`,
      url: url.toString(),
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
        setShareLabel("Link copiado!");
        window.setTimeout(() => setShareLabel("Compartilhar countdown"), 1800);
      }
    } catch {
      setShareLabel("Compartilhamento cancelado");
      window.setTimeout(() => setShareLabel("Compartilhar countdown"), 1800);
    }
  }

  return (
    <main style={{ "--accent": active.accent, "--accent-ink": active.ink } as React.CSSProperties}>
      <div className="noise" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Radar Gamer BR — início">
          <span>RADAR</span><strong>GAMER BR</strong>
        </a>
        <div className="broadcast"><i /> AO VIVO · HORÁRIO DE BRASÍLIA</div>
        <a className="tiktok-link" href="https://www.tiktok.com/" target="_blank" rel="noreferrer">
          TikTok ↗
        </a>
      </header>

      <section id="top" className="hero" key={active.slug}>
        <div className="hero-meta">
          <span>{active.issue}</span>
          <span>{active.genre}</span>
          <span>{active.platforms.join(" / ")}</span>
        </div>

        <div className="status-line">
          <span>{remaining.launched ? "JÁ DISPONÍVEL" : "PRÓXIMO SINAL"}</span>
          <span className="status-rule" />
          <span>{active.dateLabel}</span>
        </div>

        <h1>{active.title}</h1>
        <p className="kicker">{active.kicker}</p>

        {remaining.launched ? (
          <div className="launched-stamp">JÁ LANÇOU</div>
        ) : (
          <div className="countdown" aria-label={`${remaining.days} dias, ${remaining.hours} horas, ${remaining.minutes} minutos e ${remaining.seconds} segundos`}>
            {[
              [remaining.days, "DIAS"],
              [remaining.hours, "HORAS"],
              [remaining.minutes, "MIN"],
              [remaining.seconds, "SEG"],
            ].map(([value, label]) => (
              <div className="time-unit" key={label as string}>
                <strong>{pad(value as number)}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="hero-actions">
          <button className="share-button" onClick={share}>{shareLabel}<span>↗</span></button>
          <a className="source-link" href={active.source} target="_blank" rel="noreferrer">Data confirmada ↗</a>
        </div>
        <div className="signal-mark" aria-hidden="true"><span>RG</span><b>{active.issue.slice(-3)}</b></div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div>LANÇAMENTOS REAIS · CONTAGEM AO VIVO · MANDA PRO SEU DUO · LANÇAMENTOS REAIS · CONTAGEM AO VIVO · MANDA PRO SEU DUO ·</div>
      </div>

      <section className="catalog" id="lancamentos">
        <div className="catalog-heading">
          <div><span>ARQUIVO / 2026</span><h2>NO RADAR</h2></div>
          <p>Datas oficiais. Zero rumor.<br />Escolha um jogo e ligue o cronômetro.</p>
        </div>

        <div className="filters" aria-label="Filtrar por plataforma">
          {FILTERS.map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} aria-pressed={filter === item}>
              {item}
            </button>
          ))}
        </div>

        <div className="game-list">
          {filtered.map((game, index) => {
            const state = getRemaining(game.date, now);
            return (
              <button className={`game-row ${game.slug === active.slug ? "selected" : ""}`} key={game.slug} onClick={() => selectGame(game.slug)}>
                <span className="game-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="game-title">{game.title}</span>
                <span className="game-tags">{game.genre} · {game.platforms.join(" / ")}</span>
                <span className="game-date">{state.launched ? "JÁ LANÇOU" : game.dateLabel}</span>
                <span className="game-arrow">↗</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer>
        <div className="footer-callout">
          <span>O radar não dorme.</span>
          <h2>QUAL É O SEU<br />MAIS AGUARDADO?</h2>
          <a href="https://www.tiktok.com/" target="_blank" rel="noreferrer">Responde lá no TikTok ↗</a>
        </div>
        <div className="footer-bottom"><span>RADAR GAMER BR © 2026</span><span>DATAS SUJEITAS A ALTERAÇÃO PELAS DISTRIBUIDORAS</span><a href="#top">VOLTAR AO TOPO ↑</a></div>
      </footer>
    </main>
  );
}
