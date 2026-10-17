// Armas do Livro do Jogador - Semideuses RPG 3e, capítulo "Equipamento" (tabelas de armas simples e marciais).
export type WeaponEntry = {
  name: string;
  category: "Simples" | "Marcial";
  kind: "Corpo a corpo" | "Distância";
  damage: string;
  damageType: string;
  properties: string;
  range: string;
  /** Custo em dracmas; null quando o livro não informa. */
  cost: number | null;
  note: string;
};

export const WEAPON_CATALOG: ReadonlyArray<WeaponEntry> = [
  { name: "Faca", category: "Simples", kind: "Corpo a corpo", damage: "1d4", damageType: "Perfurante", properties: "Acuada, Leve, Arremessável (6/18m)", range: "", cost: 5, note: "" },
  { name: "Clava", category: "Simples", kind: "Corpo a corpo", damage: "1d4", damageType: "Concussivo", properties: "", range: "", cost: 3, note: "" },
  { name: "Lança Curta", category: "Simples", kind: "Corpo a corpo", damage: "1d6", damageType: "Perfurante", properties: "Arremessável (6/18m), Versátil (1d8)", range: "", cost: 10, note: "" },
  { name: "Cajado", category: "Simples", kind: "Corpo a corpo", damage: "1d6", damageType: "Concussivo", properties: "Versátil (1d8), Duas Mãos", range: "", cost: 5, note: "" },
  { name: "Foice Curta", category: "Simples", kind: "Corpo a corpo", damage: "1d4", damageType: "Cortante", properties: "Acuada, Leve", range: "", cost: 8, note: "" },
  { name: "Maça", category: "Simples", kind: "Corpo a corpo", damage: "1d6", damageType: "Concussivo", properties: "", range: "", cost: 15, note: "" },
  { name: "Martelo Leve", category: "Simples", kind: "Corpo a corpo", damage: "1d4", damageType: "Concussivo", properties: "Leve, Arremessável (6/18m)", range: "", cost: 10, note: "" },
  { name: "Arco Curto", category: "Simples", kind: "Distância", damage: "1d6", damageType: "Perfurante", properties: "Munição, Duas Mãos", range: "18/60m", cost: 30, note: "" },
  { name: "Funda", category: "Simples", kind: "Distância", damage: "1d4", damageType: "Concussivo", properties: "Munição", range: "9/36m", cost: 2, note: "" },
  { name: "Zarabatana", category: "Simples", kind: "Distância", damage: "1d4", damageType: "Perfurante", properties: "Munição, Recarga", range: "6/24m", cost: 15, note: "" },
  { name: "Besta Leve", category: "Simples", kind: "Distância", damage: "1d8", damageType: "Perfurante", properties: "Munição, Recarga, Duas Mãos", range: "18/60m", cost: 50, note: "" },
  { name: "Espada Curta", category: "Marcial", kind: "Corpo a corpo", damage: "1d6", damageType: "Perfurante", properties: "Acuada, Leve", range: "", cost: 40, note: "" },
  { name: "Espada Longa", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Cortante", properties: "Versátil (1d10)", range: "", cost: 80, note: "" },
  { name: "Espada Larga", category: "Marcial", kind: "Corpo a corpo", damage: "2d6", damageType: "Cortante", properties: "Duas Mãos", range: "", cost: 120, note: "" },
  { name: "Sabre", category: "Marcial", kind: "Corpo a corpo", damage: "1d6", damageType: "Cortante", properties: "Acuada, Leve", range: "", cost: 50, note: "" },
  { name: "Machado de Mão", category: "Marcial", kind: "Corpo a corpo", damage: "1d6", damageType: "Cortante", properties: "Leve, Arremessável (6/18m)", range: "", cost: 30, note: "" },
  { name: "Machado de Guerra", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Cortante", properties: "Versátil (1d10)", range: "", cost: 80, note: "" },
  { name: "Machado Grande", category: "Marcial", kind: "Corpo a corpo", damage: "1d12", damageType: "Cortante", properties: "Duas Mãos", range: "", cost: 150, note: "" },
  { name: "Lança", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Perfurante", properties: "Versátil (1d10), Arremessável (6/18m), Longa", range: "", cost: 60, note: "" },
  { name: "Alabarda", category: "Marcial", kind: "Corpo a corpo", damage: "1d10", damageType: "Cortante", properties: "Duas Mãos, Longa", range: "", cost: 120, note: "" },
  { name: "Tridente", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Perfurante", properties: "Versátil (1d10), Longa", range: "", cost: 80, note: "" },
  { name: "Martelo de Guerra", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Concussivo", properties: "Versátil (1d10)", range: "", cost: 80, note: "" },
  { name: "Maça de Guerra", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Concussivo", properties: "", range: "", cost: 70, note: "" },
  { name: "Mangual", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Concussivo", properties: "", range: "", cost: 60, note: "" },
  { name: "Adaga", category: "Marcial", kind: "Corpo a corpo", damage: "1d4", damageType: "Perfurante", properties: "Acuada, Leve, Arremessável (6/18m)", range: "", cost: 20, note: "" },
  { name: "Rapieira", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Perfurante", properties: "Acuada", range: "", cost: 100, note: "" },
  { name: "Kopis", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Cortante", properties: "Acuada", range: "", cost: 90, note: "Lâmina curva, favorita de mercenários gregos." },
  { name: "Xiphos", category: "Marcial", kind: "Corpo a corpo", damage: "1d6", damageType: "Cortante", properties: "Acuada, Leve", range: "", cost: 60, note: "Espada grega de lâmina dupla, equilibrada." },
  { name: "Doru", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Perfurante", properties: "Longa, Versátil (1d10), Arremessável (9/27m)", range: "", cost: 70, note: "Lança de hoplita; perde Longa ao ser arremessada." },
  { name: "Sarissa", category: "Marcial", kind: "Corpo a corpo", damage: "1d10", damageType: "Perfurante", properties: "Duas Mãos, Longa", range: "", cost: 130, note: "Lança macedônica enorme: Desvantagem em espaços confinados." },
  { name: "Harpe", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Cortante", properties: "Acuada, Mágica", range: "", cost: 400, note: "Espada de Perseu: ignora Resistência a Cortante." },
  { name: "Machaira", category: "Marcial", kind: "Corpo a corpo", damage: "1d8", damageType: "Cortante", properties: "Versátil (1d10)", range: "", cost: 85, note: "Vantagem contra criaturas Caídas." },
  { name: "Clava de Hércules", category: "Marcial", kind: "Corpo a corpo", damage: "2d6", damageType: "Concussivo", properties: "Duas Mãos", range: "", cost: 200, note: "Exige FOR 16+ para usar sem Desvantagem." },
  { name: "Martelo Sísmico", category: "Marcial", kind: "Corpo a corpo", damage: "1d10", damageType: "Concussivo", properties: "Duas Mãos, Longa", range: "", cost: 180, note: "Ao golpear o chão cria um pulso de 2 m: 1d4 Concussivo, sem custo de MP." },
  { name: "Foice de Guerra", category: "Marcial", kind: "Corpo a corpo", damage: "1d10", damageType: "Cortante", properties: "Duas Mãos, Longa", range: "", cost: 140, note: "" },
  { name: "Arco Longo", category: "Marcial", kind: "Distância", damage: "1d8", damageType: "Perfurante", properties: "Munição, Duas Mãos", range: "30/120m", cost: 80, note: "" },
  { name: "Arco Composto", category: "Marcial", kind: "Distância", damage: "1d10", damageType: "Perfurante", properties: "Munição, Duas Mãos", range: "24/90m", cost: 150, note: "" },
  { name: "Besta Pesada", category: "Marcial", kind: "Distância", damage: "1d10", damageType: "Perfurante", properties: "Munição, Recarga, Duas Mãos", range: "24/90m", cost: 100, note: "" },
  { name: "Besta de Mão", category: "Marcial", kind: "Distância", damage: "1d6", damageType: "Perfurante", properties: "Munição, Leve, Recarga", range: "9/36m", cost: 80, note: "" },
  { name: "Arco de Caça", category: "Marcial", kind: "Distância", damage: "1d8", damageType: "Perfurante", properties: "Munição, Duas Mãos", range: "24/80m", cost: 100, note: "Sem Desvantagem à distância mesmo depois de se mover no turno." },
  { name: "Besta de Repetição", category: "Marcial", kind: "Distância", damage: "1d8", damageType: "Perfurante", properties: "Munição, Duas Mãos", range: "18/60m", cost: 200, note: "Não gasta Ação para recarregar; esgota após 6 disparos." },
  { name: "Javelin", category: "Marcial", kind: "Distância", damage: "1d6", damageType: "Perfurante", properties: "Arremessável (9/36m), Longa", range: "", cost: 25, note: "" },
  { name: "Disco de Bronze", category: "Marcial", kind: "Distância", damage: "1d8", damageType: "Concussivo", properties: "Arremessável (12/36m)", range: "", cost: 40, note: "Volta à mão no próximo turno se não houver obstáculos." },
  { name: "Rede de Caça", category: "Marcial", kind: "Distância", damage: "", damageType: "", properties: "Arremessável (3/6m)", range: "", cost: 15, note: "TR de DES (CD 10 + mod. DES) ou Agarrado; soltar exige Ação + teste de FOR (mesma CD). A rede tem CA 10 e 5 PV." },
  { name: "Arco de Apolo", category: "Marcial", kind: "Distância", damage: "1d10", damageType: "Perf. + Ígneo", properties: "Munição, Duas Mãos, Mágica", range: "36/120m", cost: 500, note: "Dano Perfurante e Ígneo juntos; mortos-vivos sofrem +1d6 Divino." },
];
