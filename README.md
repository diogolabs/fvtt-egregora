# Egrégora: O Mundo Oculto — Sistema para Foundry VTT (`fvtt-egregora`)

Sistema **Year Zero Engine (Pilha de Dados D6)** para **Egrégora: O Mundo Oculto**, compatível com **Foundry VTT v13 e v14**.

## Recursos da Versão Base (`0.1.0`)

- **Compatibilidade Direta v13 & v14**: construído sobre `TypeDataModel`, `ApplicationV2`, `ActorSheetV2`, `ItemSheetV2` e camada de compatibilidade para `core.rollMode` (v13) e `core.messageMode` (v14).
- **Ficha Oficial Temática do Desperto**: layout em pergaminho envelhecido com tipografia carmesim, emblema arcano central, molduras ornamentais e disposição fiel à ficha oficial:
  - **Atributos**: *Força*, *Agilidade*, *Inteligência* e *Empatia* (1–5, clicáveis para rolar).
  - **Status & Condições**: *Saúde Física (PV = FOR + AGI)*, *Poder Mental (PM = INT + EMP)*, *Força de Vontade (0–10)* e *Corrupção (0–10)* com estágios automáticos.
  - **12 Perícias oficiais** agrupadas por atributo (*Potência, Combate Corpo a Corpo, Resistência, Combate à Distância, Movimento, Furtividade, Erudição, Observação, Sobrevivência, Cura, Intuição, Persuasão*), criadas automaticamente em novos personagens.
  - **Traços e Magia**: *Orgulho, Segredo Sombrio, Grande Sonho, Fraqueza* e os **6 Caminhos de Magia** (*Matéria, Fluxo, Mente, Vida, Ecos, Abismo*).
  - **Âncora**, **Qualidades**, **Defeitos**, **Talentos**, **Item Útil**, **Armas** e **Armaduras**.
- **Mecânicas Próprias de Egrégora**:
  - **Forçar (Push)** no chat com dano automático em PV/PM, ganho de **Força de Vontade** e incremento opcional de **Pontos de Perdição** do Narrador.
  - **Corrupção**: adicionar dados extras em troca de PC, **Teste de Contaminação** e rolagem nas **3 Tabelas D66 de Mutações** (*Leves, Notáveis, Aberrantes*).
  - **Conjuração Mágica**: diálogo dedicado combinando Atributo + 1 ou 2 Caminhos (regra do menor nível), gasto de FV/PV/PM e **Tabela de Qualidade de Sucessos**.
  - **Medo, Pânico e Críticos**: Teste de Medo, Tabela de Pânico (`1D6 + Corrupção`), verificação de Trauma Mental Permanente, Tabela D66 de Ferimentos Críticos e Tabela D66 de Danos Críticos em Veículos.
- **Bilíngue**: `pt-BR` e `en` com paridade validada via `node scripts/check-i18n.mjs`.

## Como Testar no Foundry VTT (v13 e v14)

### Opção 1 — Teste Local Direto (Recomendado durante o desenvolvimento)
Copie (ou crie um link simbólico) desta pasta para o diretório de sistemas do seu Foundry VTT:
- Windows (exemplo): `<FoundryData>\Data\systems\fvtt-egregora`
- Reinicie o Foundry VTT (v13 ou v14) e crie um novo mundo selecionando **Egrégora: O Mundo Oculto (YZE)**.

### Opção 2 — Instalação via Manifesto (GitHub Releases)
Após publicar uma release com `node scripts/package-release.mjs v0.1.0`, use a URL do manifesto no instalador do Foundry:
```text
https://github.com/diogolabs/fvtt-egregora/releases/latest/download/system.json
```

## Scripts Úteis

```bash
# Verificar paridade de traduções (pt-BR / en)
node scripts/check-i18n.mjs

# Gerar system.json e system.zip para Release
node scripts/package-release.mjs v0.1.0
```
