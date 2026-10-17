# Semideuses RPG — Ficha Digital

Uma ficha digital feita por um desenvolvedor para quem joga **Semideuses RPG**.
Organize o personagem, acompanhe recursos durante a sessão e leve a ficha para
qualquer dispositivo sem depender de conta ou servidor.

## Abra a ficha

**[Usar a ficha digital](https://jvcarvalho07.github.io/semideuses-rpg/)**

A ficha começa vazia, salva os dados somente no navegador e permite
exportar/importar JSON. A versão em PDF é organizada automaticamente em quantas
páginas o conteúdo precisar, com escolha entre os formatos A3, A4 e A5.

## O que você encontra

- Temas próprios para cada filiação.
- Assinaturas oficiais das 26 filiações, com regras, escolhas e notas persistentes.
- Avatar, PV, PV temporário, mana, recurso divino, Favor Divino e sustentação.
- Cálculos do Livro do Jogador: PV máximo (Dado de Vida da filiação + CON), MP máximo (6 + Conjuração, depois 2 + Conjuração por nível), Iniciativa com o +2 de Reflexos de TDAH, CA por categoria de armadura (Leve soma DES, Média soma DES até +2, Pesada é fixa) e CD das habilidades.
- Ao escolher a filiação, o atributo de Conjuração, os dois testes de resistência e o recurso da Assinatura (Fúria, Maré de −3 a +3, Almas, Comando, Pontos de Máquina…) seguem o livro, com máximo calculado por nível e Conjuração.
- Perícias automáticas: as 3 da filiação e as 3 do antecedente somam sozinhas, e a perícia repetida vira Especialização.
- Origens sem filiação (Sátiro, Ciclope, Mortal Vidente) e Legado têm as próprias regras: Dado de Vida, resistências, Mana, CA natural do Ciclope, Pontos de Sorte do Mortal e reservas pela metade no Legado.
- Aviso quando uma armadura ou escudo equipado exige proficiência que a filiação não tem.
- Equipamento direto ao ponto: botão Equipar em cada item (uma armadura e um escudo por vez), quantidade na própria linha e seletor com as 45 armas, as armaduras e os escudos do livro.
- Bênçãos e maldições com quem concedeu, duração e botão Ativa/Desligada. Os números opcionais (CA, iniciativa, deslocamento, PV máximo) entram nas contas enquanto estiverem ativos.
- Habilidades do livro carregadas sozinhas: o Dom e as habilidades base da filiação, as do Caminho escolhido (com nome ou só o final, como "Veterano"), as da origem e o traço do antecedente. Sobem de nível junto com o personagem, não duplicam o que você já cadastrou e nunca apagam o que você editou.
- Atributos, perícias e estatísticas continuam editáveis, com botão para voltar ao cálculo automático.
- Fichas antigas (v3) são migradas sem mudar os números exibidos; o que divergia do livro vira ajuste manual e aparece no aviso de importação.
- Origem única com sugestões abertas, sem limitar personagens especiais ou expansões.
- Skills, habilidades, talentos e Caminho Divino sem limite de entradas.
- Decisão final do Caminho da Lenda liberada no nível 20, com os quatro destinos do livro.
- Equipamentos, itens equipados, Dracmas e dinheiro humano com símbolo configurável.
- Habilidades e assinaturas com leitura separada da edição, detalhes completos e PDF sem formulários.
- Antecedentes, traços, aparência, história e notas.
- Layout responsivo para computador e celular, com menu fixo no rodapé do celular e uma barra com PV, MP, CA e o recurso da filiação que aparece quando você rola para longe do painel de combate.

## Gerar uma ficha com ChatGPT

Use o [modelo JSON vazio](public/semideuses-chatgpt-template.json) como contrato e
consulte o [schema V3](public/semideuses-chatgpt-schema.json). Peça ao ChatGPT
para preencher os campos existentes sem remover `officialSnapshot`, `moves` ou
`resource` das assinaturas. A ficha importa versões antigas e variantes de IA,
normaliza campos ausentes e mostra os ajustes feitos para você revisar. O contrato
também cobre avatar opcional, overrides de CA/iniciativa/deslocamento/percepção,
moedas e assinaturas estruturadas.

## Apoie o projeto

Se esta ficha ajudou a sua mesa, você pode
**[deixar uma estrela no repositório](https://github.com/JvCarvalho07/semideuses-rpg)**.
É opcional, mas ajuda outras pessoas a encontrarem o projeto.

## Créditos

**Semideuses RPG é uma criação de João Jota.** Esta ficha é um projeto
independente feito com carinho para apoiar a comunidade e facilitar as sessões.
