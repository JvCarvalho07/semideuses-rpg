import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build estático contém a ficha limpa e as ações principais", async () => {
  const [html, model, app, css, readme, signatures] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../src/filiationSignatures.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /Semideuses RPG — Ficha Digital/);
  assert.doesNotMatch(html, /Héctor Vance|João Victor/);
  assert.match(model, /name: "",/);
  assert.match(model, /origin: "",/);
  assert.match(model, /legendDestiny: "",/);
  assert.match(model, /castingDcOverride: null,/);
  assert.match(model, /avatarDataUrl: "",/);
  assert.match(model, /abilityGroups: \{ abilities: \[\], filiation: \[\], path: \[\], skills: \[\], talents: \[\] \}/);
  assert.match(model, /equipment: \[\],/);
  assert.match(model, /dracmas: 0,/);
  assert.match(model, /version: 3,/);
  assert.match(model, /filiationSignatures: \{\},/);
  assert.doesNotMatch(model, /Héstia|Hestia/);
  assert.match(app, /semideuses-sheet-v3/);
  assert.match(app, /exportJson/);
  assert.match(app, /window\.print/);
  assert.match(app, /Formato do PDF/);
  assert.match(app, /semideuses-print-format/);
  assert.match(app, /size: \$\{printFormat\} portrait/);
  assert.match(app, /printFormat === "A3"\s*\?\s*"12mm 14mm 15mm"/);
  assert.match(app, /printFormat === "A5"/);
  assert.match(app, /<option value="A5">A5<\/option>/);
  assert.match(app, /Favor divino/);
  assert.match(app, /Testes de resistência/);
  assert.match(app, /Adicionar equipamento/);
  assert.match(app, /normalizeSheet/);
  assert.match(app, /parsed\.version === 2 \|\| parsed\.version === 3/);
  assert.match(app, /ensureFiliationSignatures/);
  assert.match(app, /FiliationSignatureSection/);
  assert.match(app, /path-signature-pair/);
  assert.match(app, /skills-filiation-pair/);
  assert.match(app, /Assinatura da filiação/);
  assert.match(app, /Caminho divino/);
  assert.match(app, /origin-options/);
  assert.match(app, /legacyRace/);
  assert.doesNotMatch(app, /<span>Raça<\/span>/);
  assert.match(app, /Mortal Vidente/);
  assert.match(app, /O que restará quando a aventura terminar/);
  assert.match(app, /Ascensão Menor/);
  assert.match(app, /legacyLegendEntries/);
  assert.match(app, /castingAttackBonus = castingModifier \+ prof/);
  assert.match(app, /automaticCastingDc = 8 \+ castingModifier \+ prof/);
  assert.match(app, /CD das habilidades/);
  assert.match(app, /Bônus extra de iniciativa/);
  assert.match(app, /Apoiar o projeto no GitHub com uma estrela/);
  assert.match(app, /type="range"/);
  assert.match(app, /prepareAvatar/);
  assert.match(css, /@media print/);
  assert.match(css, /@page \{ size: A4 portrait;/);
  assert.match(css, /html\[data-print-size="A5"\] \.site-content/);
  assert.match(css, /zoom: \.7;/);
  assert.match(css, /\.stats-layout \{[\s\S]*break-inside: avoid;[\s\S]*break-after: page;/);
  assert.match(css, /\.hero-shell \{ break-after: avoid-page; \}/);
  assert.match(css, /@media \(max-width: 580px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.ability-pair \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.ability-pair \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.signature-print/);
  assert.equal((signatures.match(/id: "[^"]+",\n\s+title:/g) || []).length, 26);
  assert.match(signatures, /zeus-tempestade-crescente/);
  assert.match(signatures, /ares-furia/);
  assert.match(signatures, /poseidon-mare/);
  assert.match(signatures, /pdfPage: 65/);
  assert.match(signatures, /Estação atual/);
  assert.match(signatures, /Sintonia atual/);
  assert.doesNotMatch(signatures, /Héstia|Hestia/);
  assert.match(readme, /Semideuses RPG é uma criação de João Jota/);
  assert.doesNotMatch(readme, /Rodar localmente|Publicar no GitHub Pages/);
});
