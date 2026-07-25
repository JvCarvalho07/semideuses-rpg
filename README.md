# Semideuses RPG — Ficha Digital

Ficha de personagem estática, responsiva e sem backend. Os dados ficam apenas
no `localStorage` deste navegador. Para levar uma ficha a outro aparelho, use
`JSON` e `Importar`; `PDF` abre a impressão nativa do navegador, que pode ser
salva como PDF em quantas páginas forem necessárias.

## Rodar localmente

Requer Node.js 22 ou mais recente.

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Publicar no GitHub Pages

O workflow em `.github/workflows/deploy-pages.yml` compila a aplicação e
publica o diretório `dist` pelo GitHub Actions. Depois de criar ou conectar o
repositório, deixe Pages configurado como **GitHub Actions**. O `base path` é
calculado pelo nome do repositório no workflow, então os assets funcionam em
`https://USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Recursos

- Ficha inicial deliberadamente vazia; exemplos não são carregados por padrão.
- Filiações completas do material usado no projeto, sem Héstia, com tema e
  recurso próprio por filiação.
- PV, PV temporário e mana em barras separadas; Favor Divino em cinco caixas.
- Testes de resistência, atributos, perícias, antecedentes, traços, história e
  notas.
- Skills, habilidades gerais, habilidades de filiação, caminho divino e
  talentos ilimitados, cada um com rank, custo, ação, alcance, duração,
  recarga e descrição.
- Inventário ilimitado com tipo, quantidade, equipar/remover e cálculo
  transparente da CA a partir de armaduras, escudos e bônus equipados.
