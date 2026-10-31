// Talentos do Cap. 10 (págs. 154–162), em texto curto próprio.
// Sem imports de runtime: roda no Node (testes) e no navegador.

export type TalentGroup = "Combate" | "Perícia" | "Resistência" | "Divino";
export const TALENT_GROUPS: TalentGroup[] = ["Combate", "Perícia", "Resistência", "Divino"];

export type TalentChoice =
  | { kind: "skill"; label: string }
  | { kind: "list"; label: string; options: string[] }
  | { kind: "text"; label: string };

export type TalentPrereq = {
  text: string;
  level?: number;
  attribute?: { key: "for" | "des" | "con" | "int" | "sab" | "car"; min: number };
  talent?: string;
  skill?: string;
};

/** O que o talento muda sozinho na ficha. */
export type TalentAuto = {
  /** Especialização numa perícia fixa. */
  expertise?: string;
  /** Especialização na perícia escolhida (Especialista). */
  expertiseFromChoice?: boolean;
  /** PV máximo extra por nível (Pele de Bronze). */
  hpPerLevel?: number;
  /** MP máximo extra por nível (Reservas Divinas). */
  manaPerLevel?: number;
  /** CA base sem armadura (Armadura Natural: 12 + DES). */
  unarmoredBase?: number;
  /** +1 de CA com armadura da categoria escolhida (Especialista em Armadura). */
  armorCategoryBonus?: boolean;
  /** Vantagem nos testes de Iniciativa. */
  initiativeAdvantage?: boolean;
};

export type OfficialTalent = {
  id: string;
  name: string;
  group: TalentGroup;
  /** Meia frase para a lista de escolha. */
  summary: string;
  effects: string[];
  prereq?: TalentPrereq;
  choice?: TalentChoice;
  repeatable?: boolean;
  auto?: TalentAuto;
};

const t = (group: TalentGroup, name: string, summary: string, effects: string[], extra: Partial<OfficialTalent> = {}): OfficialTalent => ({
  id: `talento-${slug(name)}`,
  name,
  group,
  summary,
  effects,
  ...extra,
});

export function slug(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const OFFICIAL_TALENTS: OfficialTalent[] = [
  // ---------------------------------------------------------------- Combate
  t("Combate", "Especialista em Armas", "+1d4 de dano e rerrolar dano mínimo com uma arma", [
    "Com a arma escolhida, os ataques causam +1d4 de dano do mesmo tipo.",
    "Ao tirar o dano mínimo possível, rerrole e use o novo resultado.",
    "Vantagem em Atletismo para manobras feitas com essa arma.",
  ], { prereq: { text: "Proficiência na arma escolhida" }, choice: { kind: "text", label: "Arma" }, repeatable: true }),
  t("Combate", "Combatente Versátil", "arma Versátil: +1d4 com duas mãos ou +1 CA com uma", [
    "Arma Versátil com duas mãos: +1d4 de dano.",
    "Arma Versátil com uma mão: +1 na CA.",
    "Trocar entre uma e duas mãos não gasta ação.",
  ]),
  t("Combate", "Mestre do Escudo", "ataque com o escudo e proteção a aliado", [
    "Ataque com o escudo como Ação Bônus: 1d4 Concussivo + FOR.",
    "Ao Esquivar, o escudo dá Cobertura Parcial a um aliado adjacente.",
    "Quando um ataque erra você por 5 ou menos, use a Reação para empurrar o atacante 1 m.",
  ]),
  t("Combate", "Arqueiro Preciso", "tiro sem Desvantagem de perto e +1d8 parado", [
    "Ataque à distância sem Desvantagem por inimigo a 1 m.",
    "Ignora Cobertura Parcial em ataques à distância.",
    "Sem se mover no turno, o primeiro ataque à distância causa +1d8.",
  ]),
  t("Combate", "Lutador Agressivo", "move 2 m entre ataques e Vantagem na Iniciativa", [
    "Ao Atacar, mova até 2 m antes ou depois de cada ataque sem provocar Ataque de Oportunidade.",
    "Ao derrubar uma criatura a 0 PV, use a Reação para mover até 3 m sem provocar.",
    "Vantagem nos testes de Iniciativa.",
  ], { auto: { initiativeAdvantage: true } }),
  t("Combate", "Duelista", "+2 de dano com uma arma só e contra-ataque", [
    "+2 de dano corpo a corpo empunhando só uma arma de uma mão.",
    "Quando alguém no seu alcance te ataca, use a Reação para atacá-lo logo depois.",
    "Vantagem em Acrobacia para se posicionar em combate.",
  ], { prereq: { text: "Só uma arma de uma mão, sem escudo nem segunda arma" } }),
  t("Combate", "Guerreiro Defensivo", "+2 de CA ao Esquivar e PV Temporários quando erram", [
    "Ao Esquivar, +2 de CA extra até o seu próximo turno.",
    "Quando um ataque erra você, use a Reação para ganhar PV Temporários iguais à proficiência.",
    "Vantagem em TR de DES.",
  ]),
  t("Combate", "Mestre das Manobras", "manobra como Ação Bônus, CD +2 e ataque grátis", [
    "1× por turno, faça uma manobra de combate como Ação Bônus.",
    "A CD das suas manobras sobe 2.",
    "Manobra bem-sucedida permite um ataque corpo a corpo no mesmo alvo, na mesma ação.",
  ]),
  t("Combate", "Combate com Duas Armas Aprimorado", "segunda arma soma atributo e +1d6", [
    "O ataque bônus da segunda arma soma o modificador ao dano.",
    "Vale com armas Leves ou Acuadas.",
    "Acertando com as duas no mesmo turno, a segunda causa +1d6.",
  ]),
  t("Combate", "Sentinela", "Ataque de Oportunidade que para o alvo", [
    "Acertar Ataque de Oportunidade zera a velocidade do alvo neste turno.",
    "Desengajar não impede seus Ataques de Oportunidade.",
    "Se alguém no seu alcance ataca um aliado, use a Reação para atacá-lo.",
  ]),
  t("Combate", "Golpe Poderoso", "−5 no ataque para +10 de dano", [
    "Antes do ataque corpo a corpo: −5 na jogada e +10 de dano se acertar.",
    "Crítico com Golpe Poderoso causa +20 de dano.",
    "Vantagem em Atletismo para quebrar objetos e estruturas.",
  ]),
  t("Combate", "Atirador de Elite", "−5 no tiro para +10 de dano e alcance extra", [
    "Antes do ataque à distância: −5 na jogada e +10 de dano se acertar.",
    "Pode atirar além do alcance máximo, com Desvantagem e metade do dano.",
    "1× por Descanso Curto, atire como Reação quando uma criatura entrar no alcance normal.",
  ], { prereq: { text: "Talento Arqueiro Preciso", talent: "Arqueiro Preciso" } }),
  t("Combate", "Ímpeto", "+1d6 após correr 4 m e ataque durante a corrida", [
    "Mover 4 m em linha reta antes de atacar dá +1d6 de dano.",
    "Ao Correr, pode atacar em qualquer ponto do trajeto.",
    "Ataques de Oportunidade contra você durante a Corrida têm Desvantagem.",
  ]),
  t("Combate", "Reflexos de Combate", "Vantagem na Iniciativa e reação mesmo surpreso", [
    "Vantagem nos testes de Iniciativa.",
    "Surpreendido, ainda pode usar a Reação na primeira rodada.",
    "1× por Descanso Curto, ao sofrer crítico, use a Reação para reduzir o dano à metade.",
  ], { auto: { initiativeAdvantage: true } }),
  t("Combate", "Especialista em Armadura", "+1 de CA com a categoria escolhida", [
    "Leve: +1 de CA e sem Desvantagem em Furtividade.",
    "Média: +1 de CA e limite de DES sobe para +3.",
    "Pesada: +1 de CA e sem penalidade de velocidade.",
  ], { prereq: { text: "Proficiência na categoria escolhida" }, choice: { kind: "list", label: "Categoria", options: ["Leve", "Média", "Pesada"] }, repeatable: true, auto: { armorCategoryBonus: true } }),
  t("Combate", "Fúria Controlada", "1 minuto de +1d6 de dano e Vantagem em FOR e CON", [
    "1× por Descanso Curto, como Ação Bônus, entre em Fúria Controlada por 1 minuto:",
    "+1d6 de dano corpo a corpo e Vantagem em TR de FOR e CON.",
    "Durante ela não pode usar habilidades de concentração. Você não perde o controle nem ataca aliados.",
  ]),
  t("Combate", "Golpe Desarmador", "desarmar junto com o ataque", [
    "Ao acertar corpo a corpo, tente Desarmar no mesmo ataque.",
    "Vantagem em Atletismo para Desarmar.",
    "Desarmou? Pegue a arma como Ação Bônus.",
    "Tentativas de Desarmar você têm Desvantagem.",
  ]),
  t("Combate", "Combatente Montado", "luta montado e protege a montaria", [
    "Montar e desmontar não gasta movimento.",
    "Se atacarem a montaria, use a Reação para receber o ataque no lugar dela.",
    "Vantagem corpo a corpo contra criaturas Médias ou menores enquanto montado.",
    "A montaria pode usar a sua Iniciativa.",
  ], { prereq: { text: "Proficiência em Lidar com Animais", skill: "Lidar com Animais" } }),
  t("Combate", "Mago de Batalha", "habilidade de Filiação como Ação Bônus ou junto do ataque", [
    "1× por turno, uma habilidade de Filiação de Rank D ou menor que usa Ação pode ser Ação Bônus.",
    "Ao acertar corpo a corpo, ative uma habilidade de Rank E ou D no mesmo golpe, sem gastar ação.",
    "Usar habilidades de Filiação não provoca Ataque de Oportunidade.",
  ]),
  t("Combate", "Veterano de Guerra", "Vantagem no primeiro ataque e segura a queda a 0 PV", [
    "Vantagem em Percepção para notar emboscadas e armadilhas em combate.",
    "No início do combate, escolha uma criatura visível: Vantagem no primeiro ataque contra ela.",
    "1× por Descanso Longo, ao cair a 0 PV, use a Reação para TR de CON CD 15; sucesso fica com 1 PV.",
  ], { prereq: { text: "Nível 8", level: 8 } }),
  t("Combate", "Mestre do Contra-ataque", "contra-ataca quando erram você", [
    "1× por turno, quando um ataque erra você, use a Reação para atacar o atacante.",
    "Se o erro veio de você Esquivar, o contra-ataque causa +2d6.",
    "Seus Ataques de Oportunidade têm Vantagem.",
  ]),
  t("Combate", "Destruidor de Escudos", "ignora escudos e +1d6 contra cobertura", [
    "Seus ataques ignoram o bônus de CA de escudos.",
    "+1d6 de dano contra criaturas em Cobertura Parcial.",
    "1× por Descanso Curto, ao acertar, destrua um item não mágico que o alvo segura ou veste.",
  ]),
  t("Combate", "Lutador de Rua", "arma improvisada sem penalidade e luta caído", [
    "Objetos do ambiente servem de arma sem penalidade: 1d6 do tipo adequado.",
    "Caído, seus ataques não têm Desvantagem.",
    "Quando tentarem te Agarrar, use a Reação para atacar; se acertar, o agarrão tem Desvantagem.",
  ]),
  t("Combate", "Emboscador", "+2d6 contra quem não te vê e Esconder rápido", [
    "+2d6 de dano contra criaturas Surpreendidas ou que não te veem.",
    "Esconder como Ação Bônus.",
    "Depois de atacar escondido, esconda-se de novo como Ação Bônus se houver cobertura.",
  ]),
  t("Combate", "Resistência Marcial", "reduz dano com a Reação e Vantagem em CON", [
    "1× por turno, ao sofrer dano, use a Reação para reduzir 1d10 + CON.",
    "Vantagem em TR de CON.",
    "Começando o turno abaixo da metade dos PV, recupera PV iguais à CON (mínimo 1).",
  ]),
  t("Combate", "Mestre do Desarmamento", "agarra a 2 m e castiga o alvo agarrado", [
    "Agarrar e Desarmar a 2 m em vez de 1 m.",
    "Com o alvo Agarrado, como Ação Bônus e sem novo teste, escolha um efeito:",
    "Bloqueio: Incapacitado até o seu próximo turno (ele repete o teste do agarrão no fim de cada turno dele).",
    "Torção: 1d6 Concussivo e Desvantagem no próximo ataque dele. Imobilização: sem Reações até o seu próximo turno.",
  ]),

  // ---------------------------------------------------------------- Perícia
  t("Perícia", "Polímata", "3 perícias novas e rerrolar um teste", [
    "Proficiência em 3 perícias à escolha (marque na lista de Perícias).",
    "1× por Descanso Longo, ao falhar num teste de perícia, rerrole.",
  ]),
  t("Perícia", "Especialista", "Especialização numa perícia que você já treina", [
    "Especialização na perícia escolhida: soma a proficiência duas vezes.",
    "20 natural nela revela uma informação a mais.",
    "Você pode tentar CDs até 5 acima do normal.",
  ], { prereq: { text: "Proficiência na perícia escolhida" }, choice: { kind: "skill", label: "Perícia" }, repeatable: true, auto: { expertiseFromChoice: true } }),
  t("Perícia", "Linguista", "3 idiomas e comunicação básica com qualquer um", [
    "Aprende 3 idiomas.",
    "Comunicação básica com qualquer criatura inteligente, mesmo sem idioma em comum.",
    "Vantagem em Persuasão falando o idioma nativo do outro.",
  ]),
  t("Perícia", "Investigador", "Especialização em Investigação", [
    "Especialização em Investigação.",
    "Examinando algo por 1 minuto, o Mestre conta o que for relevante sem você perguntar.",
    "Vantagem em Percepção para mentiras, disfarces e itens escondidos.",
  ], { auto: { expertise: "Investigação" } }),
  t("Perícia", "Médico de Campo", "Especialização em Medicina e cura no descanso", [
    "Especialização em Medicina.",
    "Estabiliza quem está Morrendo sem kit.",
    "No Descanso Curto, até 3 aliados recuperam PV extras iguais à sua SAB.",
    "1× por Descanso Longo, em 10 minutos remove Envenenado, Cego, Surdo ou Abalado.",
  ], { auto: { expertise: "Medicina" } }),
  t("Perícia", "Rastreador Nato", "rastreia até 72 h e acha armadilhas naturais", [
    "Especialização em Sobrevivência ao rastrear.",
    "Segue rastros de até 72 horas.",
    "Quem esconde os rastros de você tem Desvantagem em Furtividade.",
    "Em ambiente natural, nota armadilhas naturais sem teste.",
  ]),
  t("Perícia", "Furtivo", "Especialização em Furtividade e se esconde na penumbra", [
    "Especialização em Furtividade.",
    "Esconde-se na Penumbra, sem precisar de Escuridão Total.",
    "Anda furtivo na velocidade normal e sem fazer barulho.",
  ], { auto: { expertise: "Furtividade" } }),
  t("Perícia", "Ladrão Habilidoso", "Especialização em Prestidigitação e roubo sem ser notado", [
    "Especialização em Prestidigitação.",
    "1× por turno, Prestidigitação como Ação Livre.",
    "O roubo só é notado no fim do combate, se você não usar o objeto à vista.",
    "Abre fechaduras não mágicas sem kit, em 1 minuto.",
  ], { auto: { expertise: "Prestidigitação" } }),
  t("Perícia", "Negociador", "Especialização em Persuasão e trégua de 1 rodada", [
    "Especialização em Persuasão.",
    "1× por Descanso Curto, criaturas hostis param de atacar por 1 rodada para ouvir você.",
    "Vantagem em Persuasão quando oferece algo de valor real.",
  ], { auto: { expertise: "Persuasão" } }),
  t("Perícia", "Enganador Nato", "Especialização em Enganação", [
    "Especialização em Enganação.",
    "Quem tenta perceber suas mentiras tem Desvantagem em Intuição.",
    "1× por Descanso Curto, inventa na hora uma história de cobertura convincente.",
  ], { auto: { expertise: "Enganação" } }),
  t("Perícia", "Intimidador", "Especialização em Intimidação e deixa Abalado", [
    "Especialização em Intimidação.",
    "Pode usar Intimidação no lugar de Persuasão.",
    "1× por combate, como Ação Bônus, uma criatura a 9 m faz TR de SAB (CD 8 + proficiência + CAR) ou fica Abalada até o fim do próximo turno dela.",
  ], { auto: { expertise: "Intimidação" } }),
  t("Perícia", "Atleta", "Especialização em Atletismo, salto dobrado e queda", [
    "Especialização em Atletismo.",
    "Escala e nada na velocidade normal.",
    "Salta o dobro da distância e da altura.",
    "Quedas de até 6 m não causam dano.",
  ], { auto: { expertise: "Atletismo" } }),
  t("Perícia", "Acrobata", "Especialização em Acrobacia e passa por inimigos", [
    "Especialização em Acrobacia.",
    "Atravessa o espaço de inimigos sem provocar Ataque de Oportunidade.",
    "Superfícies instáveis não atrapalham o movimento.",
    "Agarra e empurra com Acrobacia (DES) no lugar de Atletismo.",
  ], { auto: { expertise: "Acrobacia" } }),
  t("Perícia", "Conhecedor do Mundo Mítico", "Especialização em Saber Mítico e ficha dos monstros", [
    "Especialização em Saber Mítico.",
    "Na primeira vez que vê uma criatura mítica, o Mestre conta nome, tipo, resistências, imunidades e fraqueza principal.",
    "Vantagem em Religião / Panteão para rituais, maldições e artefatos.",
    "1× por sessão, uma pergunta ao Mestre sobre o mundo mítico, com resposta verdadeira.",
  ], { auto: { expertise: "Saber Mítico" } }),
  t("Perícia", "Sobrevivente Nato", "Especialização em Sobrevivência e nunca se perde", [
    "Especialização em Sobrevivência.",
    "Nunca se perde em ambiente natural.",
    "Acha comida e água para 4 pessoas por dia, sem teste.",
    "Clima extremo não traz penalidade.",
  ], { auto: { expertise: "Sobrevivência" } }),
  t("Perícia", "Intuição Afiada", "Especialização em Intuição e percebe mentiras", [
    "Especialização em Intuição.",
    "Quando alguém mente, o Mestre avisa que há algo errado.",
    "Vantagem em Intuição para motivos e intenções escondidas.",
    "1× por Descanso Curto, o Mestre revela a motivação principal de uma criatura.",
  ], { auto: { expertise: "Intuição" } }),
  t("Perícia", "Memória Perfeita", "lembra de tudo e rerrola Investigação ou Percepção", [
    "Lembra com precisão de tudo o que viu, ouviu ou leu.",
    "Vantagem em História, Religião / Panteão e Saber Mítico para lembrar algo específico.",
    "1× por Descanso Curto, ao falhar em Investigação ou Percepção, use a Reação para rerrolar.",
  ]),
  t("Perícia", "Artesão Habilidoso", "cria e conserta itens; armas e armaduras +1", [
    "Proficiência em todas as ferramentas de artesão.",
    "Cria itens não mágicos num Descanso Longo (o Mestre define material e tempo).",
    "Conserta equipamento num Descanso Curto, sem material especial.",
    "Armas e armaduras que você cria dão +1 no ataque ou na CA.",
  ]),
  t("Perícia", "Piloto Experiente", "pilota qualquer veículo; +2 de CA e +3 m nele", [
    "Proficiência em todos os veículos.",
    "Sem penalidade por condições ruins ao pilotar.",
    "O veículo que você pilota ganha +2 de CA e +3 m de velocidade.",
    "Manobras extremas sem teste, salvo o impossível.",
  ]),

  // ------------------------------------------------------------ Resistência
  t("Resistência", "Pele de Bronze", "+2 PV por nível e menos dano concussivo", [
    "+2 PV máximos por nível, contando os níveis que você já tem.",
    "Dano Concussivo reduzido em 2 (mínimo 1).",
    "Vantagem em Atletismo para não ser empurrado nem derrubado.",
  ], { auto: { hpPerLevel: 2 } }),
  t("Resistência", "Constituição Heroica", "Vantagem em CON e cura melhor no descanso", [
    "Vantagem em TR de CON.",
    "No Descanso Curto, role cada Dado de Vida duas vezes e use o maior.",
    "Resistência a venenos naturais.",
  ]),
  t("Resistência", "Inabalável", "difícil de empurrar e imune a Abalado", [
    "Vantagem em TR contra Empurrar, Agarrar e Derrubar.",
    "1× por Descanso Curto, ao falhar num TR contra condição, use a Reação para repetir.",
    "Imune a Abalado.",
  ]),
  t("Resistência", "Mente Fortalecida", "Vantagem contra encantamento, medo e ilusão", [
    "Vantagem em TR contra encantamento, medo e ilusão.",
    "Alvo de Loucura ou Confusão: use a Reação para fazer o teste com Vantagem.",
    "Resistência a dano Psíquico.",
  ]),
  t("Resistência", "Recuperação Acelerada", "cura extra no descanso e cura rápida 1×/dia", [
    "No Descanso Curto, recupera PV extras iguais ao nível.",
    "Ao estabilizar depois de Morrendo, recupera PV iguais à CON (mínimo 1).",
    "1× por Descanso Longo, como Ação Bônus, recupera 1d8 + CON PV.",
  ]),
  t("Resistência", "Resistência Elemental", "resistência a um elemento e MP ao ser atingido", [
    "Resistência permanente ao tipo escolhido.",
    "Ao sofrer dano desse tipo, recupera 1 MP.",
  ], { choice: { kind: "list", label: "Tipo", options: ["Ígneo", "Elétrico", "Gélido", "Ácido", "Necrótico"] }, repeatable: true }),
  t("Resistência", "Último Recurso", "segura a queda a 0 PV e +2 ferido", [
    "1× por Descanso Longo, ao cair a 0 PV, use a Reação para TR de CON CD 15; sucesso fica com 1 PV.",
    "Abaixo da metade dos PV, +2 nas jogadas de ataque.",
    "Vantagem nas Jogadas de Morte.",
  ]),
  t("Resistência", "Resistência a Condições", "Vantagem contra Paralisado, Atordoado e Incapacitado", [
    "Vantagem contra Paralisado, Atordoado e Incapacitado.",
    "Levantar de Caído custa só 2 m de movimento.",
    "Abalado não te dá penalidade mecânica.",
  ]),
  t("Resistência", "Dureza de Titã", "resiste a corte e perfuração e reduz dano em 3", [
    "Resistência a Cortante e Perfurante não mágicos.",
    "Dano não mágico reduzido em 3 (mínimo 1).",
    "Quem te acerta corpo a corpo sofre 1d4 Concussivo.",
  ], { prereq: { text: "FOR 16", attribute: { key: "for", min: 16 } } }),
  t("Resistência", "Passo Firme", "ignora Terreno Difícil e não cai", [
    "Ignora Terreno Difícil em qualquer ambiente.",
    "Consciente, ninguém te deixa Caído contra a sua vontade.",
    "Vantagem em Acrobacia para se equilibrar em superfícies instáveis.",
  ]),
  t("Resistência", "Sangue Divino Purificado", "imune a venenos e doenças comuns", [
    "Imune a venenos e doenças não mágicos.",
    "Venenos e doenças mágicos duram metade.",
    "1× por Descanso Longo, remove Envenenado de um aliado com 1 rodada de toque.",
  ]),
  t("Resistência", "Armadura Natural", "CA 12 + DES sem armadura", [
    "Sem armadura, a CA base vira 12 + DES.",
    "Sem armadura, resistência a dano Concussivo.",
    "Com armadura leve, use a maior entre ela e a CA natural.",
  ], { auto: { unarmoredBase: 12 } }),
  t("Resistência", "Resistência à Magia", "Vantagem contra magia e efeitos pela metade", [
    "Vantagem em TR contra habilidades e efeitos mágicos.",
    "1× por Descanso Longo, ao falhar num TR contra magia, use a Reação para repetir.",
    "Efeitos mágicos em você duram metade.",
  ], { prereq: { text: "Nível 8", level: 8 } }),
  t("Resistência", "Determinação Inabalável", "imune a Apavorado e levanta com 1 PV", [
    "Imune a Apavorado.",
    "1× por Descanso Longo, Morrendo, use a Ação para levantar com 1 PV.",
    "Aliados a 6 m têm Vantagem em TR contra medo.",
  ]),

  // ----------------------------------------------------------------- Divino
  t("Divino", "Favor Acumulado", "+1 de Favor Divino máximo e Favor a cada sessão", [
    "Favor Divino máximo sobe 1 (teto 4).",
    "Ganha 1 Favor Divino extra no início de cada sessão.",
    "Ao gastar Favor, role 1d4: no 1, ele não é gasto.",
  ]),
  t("Divino", "Sangue Desperto", "Rank E sem MP e recupera MP em SS ou Lendário", [
    "Habilidades de Rank E não custam MP.",
    "Ao usar uma habilidade de Rank SS ou Lendária, recupera 2 MP na hora.",
  ]),
  t("Divino", "Herança Múltipla", "uma habilidade de nível 1 de outra Filiação", [
    "Aprende uma habilidade de nível 1 de outra Filiação e usa com o custo normal de MP.",
    "Ela usa o atributo de Conjuração da sua Filiação.",
    "O Mestre pode limitar quais Filiações estão disponíveis.",
  ]),
  t("Divino", "Voz Divina", "comando de uma palavra e Vantagem com mortais", [
    "Vantagem em Persuasão e Intimidação contra mortais que sabem que você é semideus.",
    "1× por Descanso Curto, dê um Comando de uma palavra: TR de SAB (CD 8 + proficiência + CAR) ou a criatura obedece no próximo turno.",
    "Sua voz é ouvida claramente em qualquer barulho.",
  ]),
  t("Divino", "Presença Olímpica", "impressiona ao chegar e protege na 1ª rodada", [
    "Ao entrar num ambiente social, criaturas fazem TR de SAB (CD 10 + CAR); quem falha fica impressionado por 1 hora (Desvantagem em Intimidação e Enganação contra você).",
    "Vantagem em Persuasão contra quem está impressionado.",
    "Inimigos do Olimpo têm Desvantagem para te atacar na primeira rodada.",
  ]),
  t("Divino", "Toque Curativo Divino", "cura 1d8 + CAR sem MP", [
    "1× por Descanso Curto, toque um aliado e cure 1d8 + CAR PV, sem MP.",
    "Ao estabilizar um aliado Morrendo, ele recupera PV iguais à proficiência.",
    "Remove Abalado de um aliado com um toque (Ação Bônus).",
  ]),
  t("Divino", "Percepção Mítica", "vê através da Névoa e sente criaturas míticas", [
    "Vê através da Névoa sem teste.",
    "Sente criaturas míticas a 18 m (quantidade aproximada e direção).",
    "Vantagem em Percepção e Intuição no mundo sobrenatural.",
    "Sente artefatos divinos a 9 m.",
  ]),
  t("Divino", "Sintonização Divina", "MP extra no descanso e uma pergunta ao deus", [
    "Rezando 10 minutos no Descanso Curto, recupera MP extra igual à proficiência.",
    "Agindo de acordo com o domínio do seu deus, o Mestre pode dar 1 Favor Divino extra.",
    "1× por Descanso Longo, uma pergunta ao seu deus, com resposta vaga mas verdadeira.",
  ]),
  t("Divino", "Escudo de Fé", "resiste a Divino e Necrótico e anula maldição", [
    "Resistência a dano Divino e Necrótico.",
    "1× por Descanso Longo, alvo de maldição ou efeito de morte: TR de SAB; sucesso anula tudo.",
    "Aliados a 3 m têm +1 em TR contra efeitos divinos e necróticos.",
  ]),
  t("Divino", "Transcendência Momentânea", "3 rodadas de +2d6, resistência total e MP pela metade", [
    "1× por Descanso Longo, como Ação Bônus, transcende por 3 rodadas:",
    "+2d6 de dano Divino nos ataques e resistência a todo tipo de dano.",
    "Habilidades de Rank S e SS custam metade do MP; luz forte a 6 m causa 2d6 Divino por turno em mortos-vivos.",
    "Ao terminar, ganha 2 níveis de Exaustão.",
  ], { prereq: { text: "Nível 12", level: 12 } }),
  t("Divino", "Dom Profético", "visões do futuro e não ser surpreendido", [
    "1× por sessão, uma Visão Profética: dica vaga mas verdadeira sobre as próximas horas.",
    "Vantagem em Intuição para perceber perigo iminente.",
    "1× por Descanso Longo, ao ser Surpreendido, use a Reação para não ser.",
  ]),
  t("Divino", "Marca Divina", "a marca do deus assusta criaturas míticas", [
    "Vantagem em Persuasão e Intimidação contra mortais que respeitam os deuses.",
    "Criaturas míticas de INT 6 ou menos fazem TR de SAB (CD 10 + CAR) ao te ver ou ficam Abaladas por 1 rodada.",
    "Desvantagem em Furtividade onde parecer sobrenatural é perigoso: a marca não se esconde.",
  ]),
  t("Divino", "Reservas Divinas", "+1 MP máximo por nível", [
    "Seu MP máximo aumenta em um valor igual ao seu nível.",
    "Só pode ser escolhido uma vez.",
  ], { auto: { manaPerLevel: 1 } }),
  t("Divino", "Canal Divino", "metade do MP numa habilidade por descanso", [
    "1× por Descanso (curto ou longo), sua próxima habilidade custa metade do MP (arredondado para baixo, mínimo 1).",
  ]),
  t("Divino", "Eco Divino", "+2 MP para subir um Rank", [
    "Ao usar uma habilidade, pague 2 MP a mais para tratá-la como um Rank acima.",
    "1× por turno, respeitando o limite de usos diários do novo Rank.",
  ]),
];

const BY_NAME = new Map(OFFICIAL_TALENTS.map((talent) => [slug(talent.name), talent]));
const BY_ID = new Map(OFFICIAL_TALENTS.map((talent) => [talent.id, talent]));

/** Procura o `sourceId` mesmo quando a importação o deixou aninhado em `extra.extra…`. */
export function nestedSourceId(extra: unknown, depth = 0): string {
  if (!extra || typeof extra !== "object" || depth > 4) return "";
  const record = extra as Record<string, unknown>;
  if (typeof record.sourceId === "string" && record.sourceId) return record.sourceId;
  return nestedSourceId(record.extra, depth + 1);
}

function nestedChoice(extra: unknown, depth = 0): string {
  if (!extra || typeof extra !== "object" || depth > 4) return "";
  const record = extra as Record<string, unknown>;
  const options = record.selectedOptions as Record<string, unknown> | undefined;
  if (options && typeof options.choice === "string") return options.choice;
  return nestedChoice(record.extra, depth + 1);
}

function nestedCustom(extra: unknown, depth = 0): boolean {
  if (!extra || typeof extra !== "object" || depth > 4) return false;
  const record = extra as Record<string, unknown>;
  if (record.custom === true) return true;
  return nestedCustom(record.extra, depth + 1);
}

export type TalentLike = { name: string; extra?: Record<string, unknown> };

/** Talento do livro correspondente a uma entrada da ficha (pelo id de origem ou pelo nome). */
export function officialTalentFor(entry: TalentLike): OfficialTalent | undefined {
  return BY_ID.get(nestedSourceId(entry.extra)) ?? BY_NAME.get(slug(entry.name || ""));
}

/** Escolha feita no talento (perícia, categoria, arma, tipo). */
export function talentChoice(entry: TalentLike): string {
  return nestedChoice(entry.extra);
}

/** Texto próprio do jogador ou do Mestre: a ficha mostra o que está escrito, não o texto do livro. */
export function isCustomTalent(entry: TalentLike): boolean {
  return nestedCustom(entry.extra);
}

/** Texto do talento como fica guardado na ficha (um efeito por linha). */
export function talentDescription(talent: OfficialTalent) {
  return talent.effects.map((effect) => `• ${effect}`).join("\n");
}

/** O que entra sozinho na ficha, em palavras, para mostrar no cartão e na lista. */
export function talentAutoLabel(talent: OfficialTalent, choice = ""): string {
  const auto = talent.auto;
  if (!auto) return "";
  if (auto.expertise) return `Especialização em ${auto.expertise} já aplicada nas perícias`;
  if (auto.expertiseFromChoice) return choice ? `Especialização em ${choice} já aplicada nas perícias` : "Escolha a perícia para aplicar a Especialização";
  if (auto.hpPerLevel) return `+${auto.hpPerLevel} PV por nível já somados ao PV máximo`;
  if (auto.manaPerLevel) return "+1 MP por nível já somado ao MP máximo";
  if (auto.unarmoredBase) return `CA sem armadura ${auto.unarmoredBase} + DES já aplicada`;
  if (auto.armorCategoryBonus) return choice ? `+1 de CA com armadura ${choice.toLowerCase()} já aplicado` : "Escolha a categoria para aplicar o +1 de CA";
  if (auto.initiativeAdvantage) return "Vantagem na Iniciativa indicada no painel de combate";
  return "";
}
