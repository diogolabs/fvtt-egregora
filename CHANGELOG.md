# Changelog

## 0.2.1 — Dados 3D com Quinas Arredondadas e Mármore Liso Brilhoso (Foundry VTT v13 & v14)
- **Geometria 3D Arredondada (`.glb`):** todos os dados D6 de Egrégora agora usam modelos 3D glTF 2.0 dedicados com **quinas e arestas suavemente arredondadas** (em vez do cubo de quina reta padrão), perfeitamente alinhados à física e às 6 faces do Dice So Nice.
- **Acabamento Padronizado em Mármore Liso Brilhoso:** textura de mármore polido equalizada em todas as faces e variantes, com material PBR liso (`roughness: 0.15`) + camada de polimento espelhado (`KHR_materials_clearcoat`) e brilho emissivo sutil nos veios e no Glifo da face 6 (removendo a rugosidade de pedra bruta).
- **10 Variantes Arredondadas Polidas:** Base (`d6`/`db`), Perícia (`ds`), Equipamento (`dg`), Corrupção (`dk`) e os **6 Caminhos de Magia** (Matéria, Fluxo, Mente, Vida, Ecos e Abismo), além dos temas de cores padronizados com material `pristine` (brilho liso) para dados padrão.

## 0.2.0 — Integração Completa com Dice So Nice! 3D (Foundry VTT v13 & v14)
- **Dados 3D Oficiais de Egrégora (`assets/dice/`):** 36 texturas `256×256` geradas a partir das artes oficiais (faces 1–5 com números estilizados + face 6 com o Glifo de Egrégora, além de **Bump Maps** de relevo 3D e **Emissive Maps** para brilho carmesim nas fendas e no Glifo!).
- **4 Variantes Visuais Distintas na Mesa 3D:**
  - **Dado Base / Atributo (`db` e `d6`):** Obsidiana & Carmesim com brilho emissivo.
  - **Dado de Perícia (`ds`):** Obsidiana & Ouro para distinção imediata na rolagem.
  - **Dado de Equipamento (`dg`):** Aço Sombrio metálico.
  - **Dado de Corrupção (`dk`):** Sangue do Abismo com brilho carmesim intenso (denominação migrada de `dc` para `dk` para evitar conflito com a moeda nativa do Foundry).
- **Compatibilidade v13 (DSN v5) e v14 (DSN v6):** integração modular em [dice-so-nice.mjs](module/helpers/dice-so-nice.mjs) via `diceSoNiceReady`, com suporte a **Dice Roles** e **Preload** na v6 (v14) e *fallback* automático na v5 (v13).
- **Temas Dinâmicos por Caminho de Magia:** 6 temas 3D (Matéria, Fluxo, Mente, Vida, Ecos, Abismo) aplicados automaticamente em conjurações mágicas (configurável nas opções do cliente).
- **Gatilhos de SFX Customizados:** `egregora-roll` para *Sucesso (6)*, *Sucesso Múltiplo (3+)*, *Falha Crítica* e *Contaminação*.
- **Tabelas em 3D:** Pânico (`1D6`), Trauma Mental Permanente (`1D6`), Mutações (`D66`), Ferimentos Críticos (`D66`) e Danos Críticos em Veículos (`D66`) agora rolam dados 3D reais na mesa antes de revelar o resultado no chat.

## 0.1.8 — Correção da Borda dos Atributos, Remoção da Aba Efeitos e Validação de Feitiços (Foundry VTT v13 & v14)
- Removido o `clip-path` que cortava o lado esquerdo dos cartões de **Atributos** (`.eg-attr-card`), aplicando borda completa nos 4 lados com filete carmesim à esquerda.
- Removida a aba **Efeitos** da ficha do Desperto (`sheet-nav.hbs`, `actor-sheet.mjs` e `effects.hbs`), mantendo apenas **Ficha**, **Oculto & Magia** e **Biografia**.
- Removido `choices` do `StringField` opcional `secondaryPath` em Feitiços (`blank: true`), garantindo 100% de compatibilidade sem erro de string vazia no Foundry v13 e v14.

## 0.1.7 — Correção de Feitiços e Logo/Glifo Oficiais (Foundry VTT v13 & v14)
- Corrigido erro de validação ao criar Feitiços (`system: secondaryPath: may not be a blank string`) adicionando `blank: true` ao `StringField` de `secondaryPath` em [items.mjs](module/data/items.mjs).
- Substituída a tipografia do cabeçalho pela logo oficial em PNG ([assets/logo.png](assets/logo.png)) e o emblema central pelo glifo oficial ([assets/glyph.png](assets/glyph.png)), preservando exatamente as dimensões e o alinhamento das divs da ficha.
- Adicionada a pasta `imagens-egregora/` ao `.gitignore`.

## 0.1.6 — Retrato Circular 128×128 e Correção das Cores das Caixas (Foundry VTT v13 & v14)
- Retrato do Desperto ampliado para **`128×128px`** em formato circular com colunas simétricas no cabeçalho (`136px 1fr 136px`) para manter o logo **EGRÉGORA** centralizado (e `88×88px` nas fichas compactas de PNJ e Veículo).
- Corrigida a especificidade CSS das caixas marcadas (`.eg-sq-box.filled` e `.eg-corr-box`), restaurando o preenchimento escuro nos quadrados de **Atributos** e **Força de Vontade** e o tom/preenchimento carmesim nos quadrados de **Corrupção** (além do hover em `.eg-mini-btn` e `.eg-icon-btn`).

## 0.1.5 — Polimento de Focus e Retrato Circular 64×64 (Foundry VTT v13 & v14)
- Removido o prefixo `F:` do indicador de Focus em **Caminhos de Magia**, exibindo `0/0` em linha única (`white-space: nowrap`) ao lado de um seletor de Aptidão mais compacto, mantendo o tooltip explicativo no *hover*.
- Retrato do personagem ampliado para `64×64px` em formato circular (`border-radius: 50%`) com moldura leve dupla em carmesim e pergaminho.

## 0.1.4 — Restauração dos Quadrados de Atributos, Vontade e Corrupção (Foundry VTT v13 & v14)
- Removido `height: auto` do seletor global `.application.egregora button` que achatava os quadrados clicáveis (`.eg-sq-box`) de Atributos, Força de Vontade e Corrupção.
- Protegidas explicitamente as dimensões fixas de `.eg-sq-box` (`18×18px`), `.eg-mini-btn` (`26×26px`) e `.eg-icon-btn` (`22×22px`), mantendo os botões de ação em **Oculto & Magia** com altura `50px` e hover carmesim.
- Alinhados os nomes das Perícias à esquerda (`justify-content: flex-start`), seguindo fielmente a ficha oficial.

## 0.1.3 — Efeito Hover Carmesim nos Botões (Foundry VTT v13 & v14)
- Todos os botões de ação em **Oculto & Magia** mantêm o visual uniforme em pergaminho em repouso e assumem o vermelho carmesim característico de Egrégora no *mouse over* (`:hover`), com transição suave e sombra sutil.
- Corrigida a especificidade de `.eg-btn-crimson` para botões principais de diálogo e chat.

## 0.1.2 — Ajuste Definitivo da Altura dos Botões em Oculto & Magia (Foundry VTT v13 & v14)
- Aumentada a altura mínima dos botões de ação (`.eg-action-grid button.eg-btn`) para `50px` com `height: auto !important`, `max-height: none !important` e `line-height: 1.25 !important`, vencendo o estilo padrão de `<button>` do Foundry VTT v13/v14.
- Fixada a grade `.eg-action-grid` em 4 colunas equilibradas (`repeat(4, minmax(0, 1fr))`) com `<span>` nos rótulos de [occult.hbs](templates/actor/occult.hbs).

## 0.1.1 — Correção de Layout de Botões (Foundry VTT v13 & v14)
- Corrigido vazamento vertical de texto em botões com múltiplas linhas (como a grade de ações em *Oculto & Magia*, botões de diálogo e cartões de chat) ao sobrescrever a altura fixa padrão (`--button-size`) do Foundry VTT com `height: auto`, `line-height: 1.25` e `white-space: normal`.
- Ajustado `.eg-action-grid` para colunas mais confortáveis (`minmax(180px, 1fr)`) e altura uniforme (`align-items: stretch`).

## 0.1.0 — Base Inicial (Foundry VTT v13 & v14)
- Estrutura inicial do sistema **Egrégora: O Mundo Oculto (YZE)** compatível diretamente com **Foundry VTT v13 e v14** (`minimum: "13"`, `verified: "14"`).
- Ficha do Desperto (`character`) construída com `ActorSheetV2` seguindo fielmente o layout, paleta (pergaminho envelhecido, carmesim, molduras ornamentais, emblema arcano central e silhueta gótica) e organização em duas colunas da ficha oficial de Egrégora.
- Fichas dedicadas para **PNJ / Criatura** (`npc`) e **Veículo** (`vehicle`).
- 10 tipos de itens (`skill`, `talent`, `quality`, `defect`, `gear`, `weapon`, `armor`, `spell`, `mutation`, `critical`) com criação automática das **12 Perícias oficiais de Egrégora**.
- Motor de rolagem **Year Zero Engine (Pilha de Dados D6)** via YZUR com:
  - **Forçar (Push)** no chat aplicando dano em **Saúde Física (PV)** ou **Poder Mental (PM)** e concedendo **+1 Força de Vontade** por falha crítica (e opcionalmente **+1 Ponto de Perdição** para o Narrador).
  - **Dados de Corrupção (+1 PC por dado extra)**, **Teste de Contaminação**, estágios automáticos (*Puro / Manchado / Corrompido / Deformado / Besta das Sombras*) e **Tabelas D66 de Mutações** (*Leves, Notáveis e Aberrantes*).
  - **Sistema de Magia** com os **6 Caminhos** (*Matéria, Fluxo, Mente, Vida, Ecos, Abismo*), combinação de Atributo + Caminhos (usando o menor nível em caminhos mistos), gasto de FV/PV/PM e **Qualidade de Sucessos (1 a 5+)**.
  - **Teste de Medo**, **Tabela de Pânico (`1D6 + Corrupção`)**, **Trauma Mental Permanente**, **Tabela de Ferimentos Críticos (D66)** e **Danos Críticos em Veículos (D66)**.
- Localização completa em **Português (Brasil)** (`pt-BR`) e **English** (`en`), com scripts de verificação (`scripts/check-i18n.mjs`) e empacotamento (`scripts/package-release.mjs`).
