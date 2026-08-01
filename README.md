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
- Testes de resistência, atributos, perícias e estatísticas editáveis com retorno ao cálculo automático.
- Origem única com sugestões abertas, sem limitar personagens especiais ou expansões.
- Skills, habilidades, talentos e Caminho Divino sem limite de entradas.
- Decisão final do Caminho da Lenda liberada no nível 20, com os quatro destinos do livro.
- Equipamentos, itens equipados, Dracmas e dinheiro humano com símbolo configurável.
- Habilidades e assinaturas com leitura separada da edição, detalhes completos e PDF sem formulários.
- Antecedentes, traços, aparência, história e notas.
- Layout responsivo para computador e celular.

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
