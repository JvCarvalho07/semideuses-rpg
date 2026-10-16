import { FILIATIONS, type FiliationSignatureState, type SignatureMove, type SignatureResource } from "./model";
import { FILIATION_RESOURCES } from "./rules";

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
  /** Gastos e manobras da Assinatura, como no livro. Sem isso, as regras viram um único item de referência. */
  moves?: Array<Omit<SignatureMove, "id">>;
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

function officialMoves(definition: FiliationSignatureDefinition): SignatureMove[] {
  if (!definition.moves) return movesFromRules(definition.id, definition.rules);
  return definition.moves.map((move, index) => ({ ...move, id: `${definition.id}-move-${index + 1}` }));
}

const plainMoves = (moves: SignatureMove[] | undefined) => JSON.stringify((moves || []).map(({ name, cost, activation, description }) => ({ name, cost, activation, description })));

// Marcador de lugar: o valor, o mínimo e o teto reais vêm de `deriveStats` (rules.ts) na hora de exibir.
function defaultResource(filiation: string): SignatureResource | undefined {
  const spec = FILIATION_RESOURCES[filiation];
  return spec ? { name: spec.name, current: 0, max: 0, unit: spec.unit } : undefined;
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
    moves: officialMoves(definition),
    officialSnapshot: { sourceId: definition.id, title: definition.title, rules: definition.rules, pdfPage: definition.source.pdfPage },
  };
}

// Fonte de manutenção: Livro do Jogador - Semideuses RPG 3e, capítulo "As Filiações — os 26 Deuses"
// (páginas PDF 82-137). O texto é o da Assinatura de cada filiação; o recurso (mínimo, máximo e
// início) fica em `FILIATION_RESOURCES`, em rules.ts, para o contador nunca divergir da ficha.
export const FILIATION_SIGNATURES: Record<keyof typeof FILIATIONS, FiliationSignatureDefinition[]> = {
  Zeus: [{
    id: "zeus-tempestade-crescente",
    title: "Tempestade Crescente",
    rules: "A cada turno em combate você ganha 1 Carga (máx. 5) e as habilidades gastam Cargas para crescer. As Cargas somem 1 minuto depois que a luta acaba.",
    moves: [
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 82 },
  }],
  Poseidon: [{
    id: "poseidon-mare",
    title: "Maré",
    rules: "A Maré é um marcador de −3 (Baixa) a +3 (Alta) que começa em 0 a cada combate. Uma vez por turno você a sobe ou desce 1, de graça, e as habilidades mudam com ela: Alta empurra e alaga, Baixa reposiciona e acelera.",
    moves: [
      { name: "Subir ou descer a Maré", cost: "Sem custo", activation: "1×/turno", description: "Uma vez por turno, de graça, suba ou desça a Maré em 1." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 85 },
  }],
  Hades: [{
    id: "hades-almas",
    title: "Almas",
    rules: "Cada inimigo que morre a até 12 m vira uma Alma (máx. 3 + Conjuração; zeram ao fim do combate). Gaste Almas para se curar, dar outro turno a um morto invocado, esticar uma maldição ou erguer o inimigo caído como servo.",
    moves: [
      { name: "Cura necrótica", cost: "1", activation: "Sem ação (1×/turno)", description: "O próximo dano Necrótico seu nesta rodada cura você em metade do valor." },
      { name: "Servo age de novo", cost: "2", activation: "Sem ação (1×/turno)", description: "Um morto que você invocou age de novo imediatamente." },
      { name: "Estender maldição", cost: "2", activation: "Sem ação (1×/turno)", description: "Estenda por 1 rodada uma maldição ou condição que você aplicou." },
      { name: "Erguer servo", cost: "3", activation: "Reação", description: "Quando um inimigo a até 12 m cai a 0 PV, ele se levanta como seu servo até o fim do combate." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 88 },
  }],
  Atena: [{
    id: "atena-plano-de-batalha",
    title: "Plano de Batalha",
    rules: "Você comanda com um pool de Comando (2 + Conjuração; teto no dobro) que ganha +1 por turno e +1 quando um aliado acerta um inimigo marcado. Gaste para mover, proteger, mandar atacar ou dar um turno inteiro a um aliado a 18 m.",
    moves: [
      { name: "Avançar", cost: "1", activation: "Reação", description: "Um aliado a 18 m usa a Reação para mover-se até a sua velocidade sem provocar ataques de oportunidade." },
      { name: "Guarda", cost: "1", activation: "Reação", description: "Um aliado a 18 m atingido por um ataque ganha +5 de CA contra ele." },
      { name: "Golpe Ordenado", cost: "2", activation: "Reação", description: "Um aliado a 18 m usa a Reação para atacar imediatamente com uma arma, com +1d6 de dano." },
      { name: "Ofensiva Total", cost: "3", activation: "Ação", description: "Use a sua Ação: um aliado a 18 m realiza de imediato um turno completo (movimento, ação e ação bônus)." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 90 },
  }],
  Ares: [{
    id: "ares-furia",
    title: "Fúria",
    rules: "A Fúria (0 a 10) sobe quando você apanha, acerta um crítico ou derruba um inimigo, e você já começa o combate com tanta Fúria quanto PV perdeu. Gaste-a para golpear mais forte, reduzir dano, aterrorizar ou atacar de novo.",
    moves: [
      { name: "Golpe Furioso", cost: "2", activation: "Ao acertar", description: "Um ataque seu que acabou de acertar causa +1d8 de dano." },
      { name: "Couro de Guerra", cost: "3", activation: "Reação", description: "Reduza em 2d8 o dano de um golpe sofrido." },
      { name: "Rugido de Ares", cost: "2", activation: "No seu turno", description: "Um inimigo a 9 m faz TR de CAR ou fica Abalado por 1 rodada." },
      { name: "Sede de Batalha", cost: "5", activation: "No seu turno", description: "Faça imediatamente um ataque com arma adicional." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 93 },
  }],
  Apolo: [{
    id: "apolo-marca-solar",
    title: "Marca Solar",
    rules: "Suas flechas marcam o alvo com luz por 1 minuto: aliados causam +1d6 contra ele e as suas curas podem saltar para quem estiver a até 3 m de um marcado.",
    moves: [
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 95 },
  }],
  Hefesto: [{
    id: "hefesto-dispositivos",
    title: "Dispositivos",
    rules: "Você tem Pontos de Máquina (1 + metade do nível), reconfigurados no Descanso, para manter torretas, autômatos e bastiões ativos na sua Iniciativa. Nunca acumula mais do que o orçamento.",
    moves: [
      { name: "Torreta", cost: "1", activation: "Dispositivo", description: "Uma torre que atira 2d8 a até 18 m por 1 minuto." },
      { name: "Autômato", cost: "2", activation: "Dispositivo", description: "Um autômato (ND ~1/4 do nível) que age na sua Iniciativa." },
      { name: "Bastião", cost: "2", activation: "Dispositivo", description: "Uma barreira de bronze de 3 m (cobertura de três quartos) por 1 minuto." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 97 },
  }],
  Hermes: [{
    id: "hermes-ritmo",
    title: "Ritmo",
    rules: "Cada movimento de 6 m ou mais e cada ataque ou habilidade rende 1 Ritmo (máx. proficiência + Conjuração). Gaste para ganhar uma Ação Bônus extra, reposicionar aliados ou roubar um benefício mágico.",
    moves: [
      { name: "Impulso", cost: "1", activation: "Fora do turno ou ao fim dele", description: "Você ganha uma Ação Bônus adicional neste turno." },
      { name: "Reposicionar", cost: "1", activation: "Fora do turno ou ao fim dele", description: "Um aliado a 9 m se desloca 3 m sem provocar ataques de oportunidade." },
      { name: "Furto Veloz", cost: "2", activation: "Fora do turno ou ao fim dele", description: "Roube um benefício mágico ativo ou um item pequeno de um inimigo a 9 m (TR de DES)." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 100 },
  }],
  Afrodite: [{
    id: "afrodite-encanto",
    title: "Encanto",
    rules: "Você tem fichas de Encanto iguais à Conjuração, recarregadas a cada combate, e ganha mais uma quando um inimigo falha um TR contra você. Gaste para redirecionar ataques, deslumbrar ou dar ordens a quem já está enfeitiçado.",
    moves: [
      { name: "Redirecionar", cost: "1", activation: "A qualquer momento", description: "O próximo ataque de um inimigo a 12 m passa a atingir outro inimigo à sua escolha (TR de SAB nega)." },
      { name: "Deslumbrar", cost: "1", activation: "A qualquer momento", description: "Um inimigo a 12 m tem Desvantagem no próximo ataque." },
      { name: "Ordem Sussurrada", cost: "2", activation: "A qualquer momento", description: "Um inimigo já Enfeitiçado por você gasta a ação dele numa ordem simples e não suicida." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 102 },
  }],
  "Deméter": [{
    id: "demeter-crescimento",
    title: "Crescimento",
    rules: "Suas Sementes viram zonas de 3 m (até 3 ao mesmo tempo; 5 no nível 11) que crescem a cada turno e são terreno difícil para inimigos e cobertura leve para aliados. Com MP você as move, cura quem está dentro ou prende inimigos.",
    moves: [
      { name: "Mover ou crescer zona", cost: "1 MP", activation: "Gasto universal", description: "Mova uma zona 3 m ou faça-a crescer 3 m de imediato." },
      { name: "Cura da zona", cost: "2 MP", activation: "Gasto universal", description: "Uma zona cura 1d8 em cada aliado dentro dela." },
      { name: "Raízes agarrantes", cost: "3 MP", activation: "Gasto universal", description: "Inimigos dentro da zona fazem TR de FOR ou ficam Restritos até o fim do próximo turno deles." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 105 },
  }],
  "Dionísio": [{
    id: "dionisio-delirio",
    title: "Delírio",
    rules: "Suas habilidades misturam escolha e acaso: parte do efeito é rolada na Tabela de Loucura (1d6), de confusão a estupor.",
    moves: [
      { name: "1 — Confusão", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura ataca o alvo mais próximo, aliado ou não, neste turno." },
      { name: "2 — Pânico", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura fica Apavorada e foge por 1 rodada." },
      { name: "3 — Letargia", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura perde a ação neste turno." },
      { name: "4 — Euforia", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura ataca com Vantagem, mas tem Desvantagem em TR até o próximo turno." },
      { name: "5 — Frenesi", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura faz um ataque extra, mas ataques contra ela têm Vantagem até o próximo turno." },
      { name: "6 — Estupor", cost: "", activation: "Tabela de Loucura (1d6)", description: "A criatura fica Atordoada por 1 rodada." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 107 },
  }],
  "Ártemis": [{
    id: "artemis-presa-marcada",
    title: "Presa Marcada",
    rules: "Você marca uma presa por vez, com Ação Bônus e sem custo. Contra ela, você e suas Caçadoras espectrais causam +1d8 e contam como flanqueando; os outros aliados só a enxergam melhor.",
    moves: [
      { name: "Marcar a presa", cost: "Sem custo", activation: "Ação Bônus", description: "Marque uma presa por vez (1 minuto ou até marcar outra): você e suas Caçadoras espectrais causam +1d8 contra ela e contam como flanqueando." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 109 },
  }],
  "Hécate": [{
    id: "hecate-pontos-de-feitico",
    title: "Pontos de Feitiço",
    rules: "Seus Pontos de Feitiço (iguais à Conjuração, recuperados no Descanso) moldam a magia antes de conjurar: mais um alvo, mais área, mais duração ou outro tipo de dano.",
    moves: [
      { name: "Moldar a magia", cost: "Pontos de Feitiço", activation: "Antes de conjurar", description: "Gaste pontos: +1 alvo, +3 m de área, dobrar a duração ou trocar o tipo de dano." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 112 },
  }],
  "Íris": [{
    id: "iris-espectro",
    title: "Espectro",
    rules: "No início do turno, sem custo, você escolhe uma cor que muda suas habilidades: Dourado cura, Vermelho fere e cega, Azul move e protege.",
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
    moves: [
      { name: "Dourado", cost: "Sem custo", activation: "Início do turno", description: "Sintonia de cura." },
      { name: "Vermelho", cost: "Sem custo", activation: "Início do turno", description: "Sintonia de dano e cegar." },
      { name: "Azul", cost: "Sem custo", activation: "Início do turno", description: "Sintonia de mobilidade e escudo de luz." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 114 },
  }],
  "Nêmesis": [{
    id: "nemesis-divida",
    title: "Dívida",
    rules: "Você ganha Dívida ao sofrer dano de um inimigo, ser alvo de um crítico ou ver um aliado cair (máx. 5; zera ao fim do combate). Gaste para cobrar mais caro na vingança ou forçar um inimigo a repetir um TR.",
    moves: [
      { name: "Retribuição", cost: "Dívida", activation: "Ao punir", description: "+1d8 no dano de vingança." },
      { name: "Repetir TR", cost: "Dívida", activation: "Ao punir", description: "Force um inimigo a repetir um Teste de Resistência." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 116 },
  }],
  Hipnos: [{
    id: "hipnos-sonolencia",
    title: "Sonolência",
    rules: "Suas habilidades empilham Sonolência nos alvos: com 3 fichas, o alvo cai inconsciente por 1 minuto ou até sofrer dano, e cada dano sofrido tira 1 ficha.",
    moves: [
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 117 },
  }],
  Morfeu: [{
    id: "morfeu-fios-de-sonho",
    title: "Fios de Sonho",
    rules: "Quando um inimigo falha o TR contra a sua mente, você ganha 1 Fio de Sonho (máx. Conjuração). Os Fios criam ilusões úteis: cobertura, deslocar a imagem de um aliado ou impor medo.",
    moves: [
      { name: "Imagem ilusória", cost: "1", activation: "Reação", description: "A imagem ilusória de um aliado a 9 m desloca-se 3 m e o ataque que o atingiria erra." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 119 },
  }],
  Nike: [{
    id: "nike-impeto",
    title: "Ímpeto",
    rules: "O grupo junta Ímpeto sempre que um aliado derruba um inimigo ou acerta um crítico. Você o gasta para dar dano extra, ou uma ação de movimento e ataque, a um aliado.",
    moves: [
      { name: "Bônus de ataque", cost: "1", activation: "Gasto universal", description: "+1d6 num ataque de um aliado." },
      { name: "Ação coletiva", cost: "2", activation: "Reação do aliado", description: "Um aliado usa a Reação para mover-se até metade da velocidade e atacar." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 121 },
  }],
  Tique: [{
    id: "tique-dados-de-sorte",
    title: "Dados de Sorte",
    rules: "Suas habilidades criam e distribuem Dados de Sorte (rolar duas vezes e ficar com o melhor) e Dados de Azar (o pior) para a mesa inteira, e você pode guardar dados ao distribuí-los.",
    moves: [
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 123 },
  }],
  "Tânatos": [{
    id: "tanatos-marca-da-morte",
    title: "Marca da Morte",
    rules: "Você marca à vontade um alvo visível a até 18 m (duas marcas a partir do nível 2). Se ele cair a 25% dos PV ou menos, a marca detona: TR de CON ou vai a 0 PV; quem resiste sofre 4d8 Necrótico (6d8 no nível 11+).",
    moves: [
      { name: "Marca da Morte", cost: "Sem custo", activation: "Ação Bônus", description: "Marque um alvo visível a até 18 m por 1 minuto (duas marcas a partir do nível 2, com Olho do Fim). Se cair a 25% dos PV ou menos, a marca detona: TR de CON ou 0 PV; quem resiste sofre 4d8 Necrótico (6d8 no nível 11+)." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 125 },
  }],
  "Éolo": [{
    id: "eolo-ventania",
    title: "Ventania",
    rules: "Você mantém uma esfera de vento de 6 m e a move até 6 m por turno com Ação Bônus. Dentro dela você empurra inimigos, desvia projéteis ou dá mobilidade a aliados, e suas habilidades ficam mais fortes.",
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
    moves: [
      { name: "Mover a esfera", cost: "Sem custo", activation: "Ação Bônus", description: "Mova a esfera de vento de 6 m até 6 m por turno." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 127 },
  }],
  Circe: [{
    id: "circe-reagentes",
    title: "Reagentes",
    rules: "No Descanso você prepara Reagentes (iguais à Conjuração) e os gasta sem MP: poção de cura, pó sonífero, frasco corrosivo ou uma essência que remove uma condição.",
    moves: [
      { name: "Poção", cost: "1", activation: "Gasto de Reagente", description: "Um aliado a 9 m recupera 3d6 PV." },
      { name: "Pó Sonífero", cost: "1", activation: "Gasto de Reagente", description: "Um alvo a 9 m faz TR de CON ou fica Lento por 1 rodada." },
      { name: "Frasco Corrosivo", cost: "1", activation: "Gasto de Reagente", description: "Área de 3 m: 2d6 de dano de ácido (TR de DES reduz à metade)." },
      { name: "Essência", cost: "1", activation: "Gasto de Reagente", description: "Um aliado remove uma condição." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 129 },
  }],
  "Perséfone": [{
    id: "persefone-estacao",
    title: "Estação",
    rules: "Com Ação Bônus você alterna entre Primavera (cura e crescimento) e Inverno (dano necrótico e controle). Muitas habilidades têm uma cláusula para cada postura.",
    choices: [{
      id: "estacao-atual",
      label: "Estação atual",
      defaultValue: "primavera",
      options: [
        { value: "primavera", label: "Primavera - cura e crescimento" },
        { value: "inverno", label: "Inverno - necrótico e controle" },
      ],
    }],
    moves: [
      { name: "Primavera", cost: "Sem custo", activation: "Ação Bônus", description: "Postura de cura e crescimento." },
      { name: "Inverno", cost: "Sem custo", activation: "Ação Bônus", description: "Postura de dano necrótico e controle." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 131 },
  }],
  Hebe: [{
    id: "hebe-vigor",
    title: "Vigor",
    rules: "Hebe não usa Mana: o Vigor (2 × nível) volta no Descanso Longo e paga, com Ação Bônus, cura, limpeza de condições, PV Temporários ou o reerguer de um aliado a 0 PV.",
    moves: [
      { name: "Curar", cost: "1", activation: "Ação Bônus (1×/turno)", description: "Um aliado a até 9 m recupera 1d8 PV." },
      { name: "Limpar condição", cost: "2", activation: "Ação Bônus (1×/turno)", description: "Remova de um aliado uma condição entre Apavorado, Atordoado, Cego, Envenenado ou Lento." },
      { name: "PV Temporários", cost: "2", activation: "Ação Bônus (1×/turno)", description: "Um aliado ganha PV Temporários iguais ao seu nível." },
      { name: "Reerguer", cost: "3", activation: "Ação Bônus (1×/turno)", description: "Um aliado a 0 PV volta com 1 PV e de pé, sem gastar o movimento dele." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 133 },
  }],
  Eros: [{
    id: "eros-vinculos",
    title: "Vínculos",
    rules: "Com uma Ação você liga duas criaturas a 12 m (no máximo tantos Vínculos quanto a Conjuração). Guardião reparte dano entre aliados, Espelho devolve metade do dano entre inimigos e Grilhão os prende a 6 m um do outro.",
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
    moves: [
      { name: "Vínculo Guardião", cost: "Vínculo", activation: "Ação", description: "Entre aliados: cada um pode redirecionar para o outro metade do dano que sofreria." },
      { name: "Vínculo Espelho", cost: "Vínculo", activation: "Ação", description: "Entre inimigos: metade do dano que um sofre, o outro também sofre." },
      { name: "Vínculo Grilhão", cost: "Vínculo", activation: "Ação", description: "Entre inimigos: não podem se afastar mais de 6 m um do outro nem ajudar um ao outro." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 135 },
  }],
  Nyx: [{
    id: "nyx-escuridao",
    title: "Escuridão",
    rules: "Com Ação Bônus você cria uma zona de escuridão de 3 m a até 12 m, ou move a sua em até 6 m (uma por vez). Só você e os aliados enxergam dentro dela, e suas habilidades ficam mais fortes contra quem está na escuridão.",
    moves: [
      { name: "Zona de escuridão", cost: "Sem custo", activation: "Ação Bônus", description: "Crie uma zona de escuridão mágica de 3 m a até 12 m, ou mova uma zona sua em até 6 m (uma zona por vez)." },
    ],
    source: { book: "Livro do Jogador - Semideuses RPG 3e", pdfPage: 137 },
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
    // Assinatura oficial que o jogador nunca editou acompanha o texto atual do livro; escolhas e notas ficam.
    const snapshot = entry.officialSnapshot;
    const pristine = !entry.custom && snapshot && entry.rules === snapshot.rules && plainMoves(entry.moves) === plainMoves(movesFromRules(entry.sourceId, snapshot.rules));
    if (pristine && snapshot.rules !== definition.rules) {
      return { ...official, id: entry.id, selectedOptions: { ...official.selectedOptions, ...entry.selectedOptions }, notes: entry.notes };
    }
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
