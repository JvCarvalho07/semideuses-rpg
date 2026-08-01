import { FILIATIONS, type FiliationSignatureState, type SignatureMove, type SignatureResource } from "./model";

export type SignatureChoice = {
  id: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
};

export type FiliationSignatureDefinition = {
  id: string;
  title: string;
  rules: string;
  choices?: SignatureChoice[];
  source: {
    book: "Livro do Jogador - Semideuses RPG 3e";
    pdfPage: number;
  };
};

function summaryFromRules(rules: string) {
  const sentence = rules.match(/^(.{1,180}?[.!?])(?:\s|$)/)?.[1];
  return sentence || rules.slice(0, 180);
}

function activationFromText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("ação bônus")) return "Ação Bônus";
  if (lower.includes("reação")) return "Reação";
  if (lower.includes("ação")) return "Ação";
  return "Conforme descrição";
}

function movesFromRules(id: string, rules: string): SignatureMove[] {
  const moves = rules.split(/;\s+/).flatMap((part, index) => {
    const match = part.match(/(?:^|:\s*)([^,:-]+),\s*([^ -]+(?:\s+[^ -]+)?)\s*-\s*(.+)$/);
    if (!match) return [];
    return [{ id: `${id}-move-${index + 1}`, name: match[1].trim(), cost: match[2].trim(), activation: activationFromText(match[3]), description: match[3].trim() }];
  });
  return moves.length ? moves : [{ id: `${id}-reference`, name: "Referência oficial", cost: "", activation: "Conforme descrição", description: rules }];
}

function defaultResource(filiation: string): SignatureResource | undefined {
  const entry = FILIATIONS[filiation as keyof typeof FILIATIONS];
  return entry ? { name: entry.resource, current: 0, max: entry.max, unit: "cargas" } : undefined;
}

export function makeOfficialState(definition: FiliationSignatureDefinition, filiation = ""): FiliationSignatureState {
  return {
    id: definition.id,
    sourceId: definition.id,
    title: definition.title,
    rules: definition.rules,
    selectedOptions: Object.fromEntries(
      (definition.choices || []).map((choice) => [choice.id, choice.defaultValue]),
    ),
    notes: "",
    custom: false,
    summary: summaryFromRules(definition.rules),
    resource: defaultResource(filiation),
    recovery: "",
    costs: "",
    moves: movesFromRules(definition.id, definition.rules),
    officialSnapshot: { sourceId: definition.id, title: definition.title, rules: definition.rules, pdfPage: definition.source.pdfPage },
  };
}

// Fonte de manutenção: Livro do Jogador - Semideuses RPG 3e, capítulo 4,
// "As Filiações - os 26 Deuses", páginas PDF 31-65. O Livro do Mestre foi
// conferido integralmente e não acrescenta assinaturas de personagem.
export const FILIATION_SIGNATURES: Record<keyof typeof FILIATIONS, FiliationSignatureDefinition[]> = {
  Zeus: [{
    id: "zeus-tempestade-crescente",
    title: "Tempestade Crescente",
    rules: "No início de cada um dos seus turnos em combate você ganha 1 Carga (máximo 5), que some após 1 minuto fora de combate. Muitas habilidades gastam Cargas para crescer: o seu poder sobe conforme a luta esquenta.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 31 },
  }],
  Poseidon: [{
    id: "poseidon-mare",
    title: "Maré",
    rules: "Você mantém um marcador de Maré que vai de -3 (Baixa) a +3 (Alta), começando em 0 a cada combate. Uma vez por turno, de graça, suba ou desça a Maré em 1. Habilidades têm cláusulas de Maré Alta (mais área e empurrão) e Maré Baixa (mais mobilidade e reposicionamento), cuja força cresce com o valor atual.",
    choices: [{
      id: "mare-atual",
      label: "Maré atual",
      defaultValue: "0",
      options: [
        { value: "-3", label: "-3 - Baixa" },
        { value: "-2", label: "-2 - Baixa" },
        { value: "-1", label: "-1 - Baixa" },
        { value: "0", label: "0 - Neutra" },
        { value: "1", label: "+1 - Alta" },
        { value: "2", label: "+2 - Alta" },
        { value: "3", label: "+3 - Alta" },
      ],
    }],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 33 },
  }],
  Hades: [{
    id: "hades-almas",
    title: "Almas",
    rules: "Sempre que um inimigo morre a até 12 m de você, ganhe 1 ficha de Alma (máximo 3 + seu modificador de Conjuração); as fichas zeram no fim do combate. Gaste Almas para invocar mortos extras, converter dano causado em cura ou estender maldições.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 35 },
  }],
  Atena: [{
    id: "atena-plano-de-batalha",
    title: "Plano de Batalha",
    rules: "Você tem um pool de Comando igual a 2 + seu modificador de Conjuração, que enche a cada combate (máximo: o dobro do valor inicial). Você ganha +1 Comando no início de cada turno seu e +1 quando um aliado acerta um inimigo marcado por você. Gastar Comando (no máximo uma opção por gatilho): Avançar, 1 Comando - um aliado a 18 m usa a Reação para mover-se até a velocidade sem provocar ataques de oportunidade. Guarda, 1 Comando - como Reação, um aliado a 18 m atingido ganha +5 de CA contra o ataque. Golpe Ordenado, 2 Comando - um aliado a 18 m usa a Reação para atacar com uma arma e +1d6 de dano. Ofensiva Total, 3 Comando - use sua Ação para um aliado a 18 m realizar imediatamente um turno completo.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 37 },
  }],
  Ares: [{
    id: "ares-furia",
    title: "Fúria",
    rules: "Você tem um medidor de Fúria de 0 a 10. Ganha 1 quando sofre dano e 2 quando causa um crítico ou derruba um inimigo. Começa cada combate com Fúria igual a quanto de PV já perdeu. Gastar Fúria (no máximo uma opção por gatilho): Golpe Furioso, 2 - um ataque que acertou causa +1d8; Couro de Guerra, 3 - como Reação, reduza o dano sofrido em 2d8; Rugido de Ares, 2 - um inimigo a 9 m faz TR de CAR ou fica Abalado por 1 rodada; Sede de Batalha, 5 - faça imediatamente um ataque com arma adicional.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 39 },
  }],
  Apolo: [{
    id: "apolo-marca-solar",
    title: "Marca Solar",
    rules: "Suas flechas marcam o alvo com luz por 1 minuto. Aliados causam +1d6 de dano contra alvos marcados, e suas curas podem saltar para um aliado a até 3 m de um marcado.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 40 },
  }],
  Hefesto: [{
    id: "hefesto-dispositivos",
    title: "Dispositivos",
    rules: "Você tem Pontos de Máquina iguais a 1 + metade do seu nível, reconfigurados no Descanso. Os dispositivos custam Pontos em vez de MP, e você mantém no máximo tantos ativos quanto seus Pontos. Torreta, 1 Ponto - atira 2d8 a até 18 m por 1 minuto. Autômato, 2 Pontos - ND aproximado de 1/4 do nível e age na sua Iniciativa. Bastião, 2 Pontos - barreira de bronze de 3 m, com cobertura de três quartos, por 1 minuto.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 42 },
  }],
  Hermes: [{
    id: "hermes-ritmo",
    title: "Ritmo",
    rules: "Você ganha 1 ficha de Ritmo quando se move 6 m ou mais e 1 quando faz um ataque ou habilidade (máximo = Bônus de Proficiência + Conjuração). Gastos: Impulso, 1 - Ação Bônus adicional neste turno; Reposicionar, 1 - um aliado a 9 m se desloca 3 m sem provocar ataques de oportunidade; Furto Veloz, 2 - roube um benefício mágico ativo ou item pequeno de um inimigo a 9 m, com TR de DES.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 43 },
  }],
  Afrodite: [{
    id: "afrodite-encanto",
    title: "Encanto",
    rules: "Você tem fichas de Encanto iguais ao seu modificador de Conjuração, que enchem a cada combate e crescem +1 quando um inimigo falha um TR contra você. Gastos: Redirecionar, 1 - o próximo ataque de um inimigo a 12 m atinge outro inimigo à sua escolha, TR de SAB nega; Deslumbrar, 1 - um inimigo a 12 m tem Desvantagem no próximo ataque; Ordem Sussurrada, 2 - um inimigo já Enfeitiçado gasta a ação numa ordem simples e não suicida.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 45 },
  }],
  "Deméter": [{
    id: "demeter-crescimento",
    title: "Crescimento",
    rules: "Suas zonas de plantas persistem e se espalham 1,5 a 3 m por turno, criando terreno difícil, cobertura e cura contínua para aliados dentro delas. Aos poucos, o campo inteiro vira o seu jardim.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 47 },
  }],
  "Dionísio": [{
    id: "dionisio-delirio",
    title: "Delírio",
    rules: "Algumas habilidades usam a Tabela de Loucura (1d6): 1 Confusão - ataca o alvo mais próximo; 2 Pânico - fica Apavorada e foge por 1 rodada; 3 Letargia - perde a ação; 4 Euforia - ataca com Vantagem, mas tem Desvantagem em TR; 5 Frenesi - faz um ataque extra, mas ataques contra ela têm Vantagem; 6 Estupor - fica Atordoada por 1 rodada.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 48 },
  }],
  "Ártemis": [{
    id: "artemis-presa-marcada",
    title: "Presa Marcada",
    rules: "Você marca uma presa por vez; você e suas Caçadoras espectrais, se as tiver, concentram fogo nela, com dano extra e flanqueamento automático.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 49 },
  }],
  "Hécate": [{
    id: "hecate-pontos-de-feitico",
    title: "Pontos de Feitiço",
    rules: "Você tem um pool igual ao seu modificador de Conjuração, recuperado no Descanso. Antes de conjurar, gaste pontos para moldar a magia: +1 alvo, +3 m de área, dobrar a duração ou trocar o tipo de dano.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 51 },
  }],
  "Íris": [{
    id: "iris-espectro",
    title: "Espectro",
    rules: "No início do turno, sem custo, você sintoniza uma cor que muda suas habilidades: Dourado para cura, Vermelho para dano e ofuscar, ou Azul para mobilidade e escudo de luz.",
    choices: [{
      id: "cor-atual",
      label: "Sintonia atual",
      defaultValue: "dourado",
      options: [
        { value: "dourado", label: "Dourado - cura" },
        { value: "vermelho", label: "Vermelho - dano e ofuscar" },
        { value: "azul", label: "Azul - mobilidade e escudo" },
      ],
    }],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 52 },
  }],
  "Nêmesis": [{
    id: "nemesis-divida",
    title: "Dívida",
    rules: "Você ganha 1 ficha de Dívida quando sofre dano de um inimigo, é alvo de um crítico ou um aliado cai (máximo 5; zera no fim do combate). Gaste Dívida para amplificar a retribuição: +1d8 no dano de vingança ou force um inimigo a repetir um TR.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 53 },
  }],
  Hipnos: [{
    id: "hipnos-sonolencia",
    title: "Sonolência",
    rules: "Suas habilidades aplicam fichas de Sonolência. Quando um alvo acumula 3 fichas, ele cai Inconsciente automaticamente por 1 minuto ou até sofrer dano; sofrer dano remove 1 ficha.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 54 },
  }],
  Morfeu: [{
    id: "morfeu-fios-de-sonho",
    title: "Fios de Sonho",
    rules: "Ao acertar a mente de um inimigo, com TR falho contra você, ganhe 1 Fio (máximo = Conjuração). Gaste Fios para manifestar ilusões: criar cobertura, mover a imagem de um aliado ou impor medo. Gasto universal - Reação, 1 Fio: a imagem ilusória de um aliado a 9 m desloca-se 3 m e o ataque que o atingiria erra.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 55 },
  }],
  Nike: [{
    id: "nike-impeto",
    title: "Ímpeto",
    rules: "O grupo acumula 1 de Ímpeto quando um aliado reduz um inimigo a 0 PV ou acerta um crítico. Gastos universais: 1 Ímpeto - +1d6 num ataque de um aliado; 2 Ímpeto - um aliado usa a Reação para mover-se até metade da velocidade e atacar.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 56 },
  }],
  Tique: [{
    id: "tique-dados-de-sorte",
    title: "Dados de Sorte",
    rules: "Suas habilidades criam e distribuem Dados de Sorte, que permitem rolar duas vezes e usar o melhor resultado, e Dados de Azar, que forçam o inimigo a rolar duas vezes e usar o pior. Você pode reter dados ao distribuí-los.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 57 },
  }],
  "Tânatos": [{
    id: "tanatos-marca-da-morte",
    title: "Marca da Morte",
    rules: "Você marca um alvo à vontade. Se um alvo marcado cair a 25% dos PV ou menos, a marca detona: ele faz TR de CON ou é reduzido a 0 PV; quem resiste sofre 4d8 de dano Necrótico, ou 6d8 no nível 11+.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 58 },
  }],
  "Éolo": [{
    id: "eolo-ventania",
    title: "Ventania",
    rules: "Você mantém uma esfera de vento de 6 m que move até 6 m por turno, com Ação Bônus. Dentro dela você decide: empurrar inimigos, desviar projéteis ou dar mobilidade a aliados, e suas habilidades ficam mais fortes.",
    choices: [{
      id: "efeito-atual",
      label: "Efeito atual",
      defaultValue: "empurrar",
      options: [
        { value: "empurrar", label: "Empurrar inimigos" },
        { value: "desviar", label: "Desviar projéteis" },
        { value: "mobilidade", label: "Mobilidade para aliados" },
      ],
    }],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 59 },
  }],
  Circe: [{
    id: "circe-reagentes",
    title: "Reagentes",
    rules: "No Descanso, prepare Reagentes iguais ao seu modificador de Conjuração. Cada opção gasta 1 Reagente, sem MP: Poção - um aliado a 9 m recupera 3d6 PV; Pó Sonífero - alvo a 9 m faz TR de CON ou fica Lento por 1 rodada; Frasco Corrosivo - área de 3 m sofre 2d6 de ácido, TR de DES reduz à metade; Essência - um aliado remove uma condição.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 60 },
  }],
  "Perséfone": [{
    id: "persefone-estacao",
    title: "Estação",
    rules: "Você está em Primavera, voltada a cura e crescimento, ou Inverno, voltado a dano necrótico e controle, alternando como Ação Bônus. Muitas habilidades têm uma cláusula para cada postura.",
    choices: [{
      id: "estacao-atual",
      label: "Estação atual",
      defaultValue: "primavera",
      options: [
        { value: "primavera", label: "Primavera - cura e crescimento" },
        { value: "inverno", label: "Inverno - necrótico e controle" },
      ],
    }],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 62 },
  }],
  Hebe: [{
    id: "hebe-vigor",
    title: "Vigor",
    rules: "Hebe não usa Mana: tem um pool de Vigor igual a 2 x seu nível, recuperado no Descanso Longo e pela metade no Curto. Gaste Vigor livremente, como Ação Bônus, para sustentar o grupo: curar, limpar condições ou conceder PV Temporários.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 63 },
  }],
  Eros: [{
    id: "eros-vinculos",
    title: "Vínculos",
    rules: "Como Ação, ligue duas criaturas a 12 m, com TR para inimigos. Mantenha no máximo Vínculos iguais ao modificador de Conjuração. Guardião, entre aliados - cada um pode redirecionar ao outro metade do dano que sofreria. Espelho, entre inimigos - metade do dano que um sofre, o outro também sofre. Grilhão, entre inimigos - não podem se afastar mais de 6 m nem ajudar um ao outro.",
    choices: [{
      id: "tipo-atual",
      label: "Tipo em uso",
      defaultValue: "guardiao",
      options: [
        { value: "guardiao", label: "Guardião - proteção entre aliados" },
        { value: "espelho", label: "Espelho - dano compartilhado" },
        { value: "grilhao", label: "Grilhão - distância e cooperação limitadas" },
      ],
    }],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 64 },
  }],
  Nyx: [{
    id: "nyx-escuridao",
    title: "Escuridão",
    rules: "Como Ação Bônus, crie uma zona de escuridão mágica de 3 m a até 12 m, ou mova uma zona sua em até 6 m. Você mantém uma zona por vez; só você e aliados enxergam dentro. Suas habilidades ficam mais fortes contra alvos na escuridão.",
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 65 },
  }],
};

export function ensureFiliationSignatures(
  states: Record<string, FiliationSignatureState[]> | undefined,
  filiation: string,
) {
  const currentStates = states || {};
  const existing = (currentStates[filiation] || []).map((entry) => {
    const definition = Object.values(FILIATION_SIGNATURES).flat().find((item) => item.id === entry.sourceId);
    if (!definition) {
      return {
        ...entry,
        summary: entry.summary || entry.rules || entry.title,
        recovery: entry.recovery || "",
        costs: entry.costs || "",
        moves: entry.moves || [{ id: `${entry.id}-reference`, name: "Referência da ficha", cost: "", activation: "Conforme descrição", description: entry.rules || "" }],
      };
    }
    const official = makeOfficialState(definition, filiation);
    return {
      ...official,
      ...entry,
      title: entry.title || official.title,
      rules: entry.rules || official.rules,
      summary: entry.summary || official.summary,
      resource: entry.resource || official.resource,
      recovery: entry.recovery || official.recovery,
      costs: entry.costs || official.costs,
      moves: entry.moves?.length ? entry.moves : official.moves,
      officialSnapshot: entry.officialSnapshot || official.officialSnapshot,
    };
  });
  const official = FILIATION_SIGNATURES[filiation as keyof typeof FILIATION_SIGNATURES] || [];
  const existingSourceIds = new Set(existing.map((entry) => entry.sourceId));
  const missingOfficial = official
    .filter((definition) => !existingSourceIds.has(definition.id))
    .map((definition) => makeOfficialState(definition, filiation));

  if (missingOfficial.length === 0 && currentStates[filiation] && existing.every((entry, index) => entry === currentStates[filiation]?.[index])) return currentStates;
  return {
    ...currentStates,
    [filiation]: [...existing, ...missingOfficial],
  };
}

export function signatureDefinition(entry: FiliationSignatureState) {
  return Object.values(FILIATION_SIGNATURES)
    .flat()
    .find((definition) => definition.id === entry.sourceId);
}
