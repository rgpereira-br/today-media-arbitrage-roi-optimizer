# Design System & Architecture Specification: Today Media Arbitrage & ROI Optimizer

Este documento descreve a arquitetura técnica, as escolhas de design e a especificação de interface da ferramenta desenvolvida para o concurso da **It's Today Media**.

---

## 1. Visão Geral

O **Today Media Arbitrage & ROI Optimizer** é uma ferramenta de uso local (Client-Side) voltada para gestores de tráfego pago (media buyers). Ela permite correlacionar e cruzar dados de custos de tráfego (provenientes de plataformas de anúncios como Meta Ads, Google Ads, Taboola, TikTok Ads) com dados de receitas de conversão (provenientes de plataformas de afiliados como ClickBank, Hotmart, Shopify).

---

## 2. Decision Log (Registro de Decisões)

### Decisão 1: Arquitetura Estática SPA (Single Page Application)
* **Status**: Aprovada.
* **Alternativas Consideradas**: Web App full-stack Next.js com banco de dados.
* **Por que foi escolhida**: Garante resiliência absoluta para o concurso. Não há risco de quebra de APIs ou expiração de credenciais de banco. Carregamento instantâneo no navegador do avaliador e facilidade de deploy.
* **Trade-offs**: Não possui persistência em banco de dados; todas as análises ocorrem em memória na sessão local do usuário.

### Decisão 2: Processamento e Junção (Join) de CSV do lado do Cliente (Client-Side)
* **Status**: Aprovada.
* **Alternativas Consideradas**: Processamento em servidor Node.js/Python com armazenamento de arquivos.
* **Por que foi escolhida**: Garante privacidade e segurança absoluta de dados financeiros corporativos. Os arquivos confidenciais de lucros e custos de anúncios nunca saem do computador do usuário.
* **Trade-offs**: Limitado ao poder de processamento do navegador do usuário (otimizado para arquivos de até 10.000 linhas, que cobre facilmente o uso diário de campanhas).

### Decisão 3: Mapeamento Inteligente com Fallback Manual na Interface
* **Status**: Aprovada.
* **Alternativas Consideradas**: Parser rígido apenas para Meta Ads e Google Ads.
* **Por que foi escolhida**: Exportações de CSV de plataformas variam constantemente devido ao idioma do painel, fuso horário e atualizações. O algoritmo de detecção automática por palavras-chave com uma interface visual de mapeamento (onde o usuário arrasta e associa as colunas que representam "Custo", "Campanha", "Receita" e "Data") impede que a ferramenta falhe diante de cabeçalhos inesperados.
* **Trade-offs**: Adiciona uma etapa opcional de interface para o usuário quando o mapeamento automático falha.

---

## 3. Fluxo de Dados (Data Flow)

```
[CSV de Custos] -------\
                        +---> [Mapeador Inteligente] ---> [Junção de Dados (Join)] ---> [Calculadora de ROI]
[CSV de Receitas] ------/       (Mapeia Colunas)             (Por ID/Nome & Data)          (Lucro, ROI, CPA)
                                                                                                  |
                                                                                                  v
                                                                                       [Dashboard Interativo]
                                                                                                  +
                                                                                       [Recomendações da IA]
                                                                                       (Via Gemini API Proxy)
```

1. **Upload**: O usuário faz o upload de dois arquivos usando áreas de arrastar-e-soltar (drag-and-drop) de alta resposta visual.
2. **Mapeamento de Cabeçalhos**:
   - O algoritmo analisa os cabeçalhos. Se encontrar nomes comuns, define o mapeamento automaticamente.
   - Se faltarem colunas obrigatórias (*Campanha*, *Data*, *Valor de Custo* ou *Valor de Receita*), exibe a interface de mapeamento para o usuário selecionar as colunas correspondentes de cada arquivo.
3. **Parse & Consolidação (Join)**:
   - Os dados são lidos em memória.
   - O sistema realiza um agrupamento de custos por **Campanha** e **Data**.
   - Faz o cruzamento correspondente com as receitas.
4. **Cálculo de Métricas**:
   - `Lucro Líquido = Receita Total - Custo Total`
   - `ROI = (Lucro Líquido / Custo Total) * 100`
   - `CPA = Custo Total / Conversões` (se houver coluna de conversões)
5. **Geração de Insights da IA**:
   - As métricas calculadas das 10 principais campanhas são consolidadas em formato estruturado leve (JSON) e enviadas para o modelo Gemini 1.5/2.0 para gerar comentários práticos sobre quais campanhas pausar ou escalar.

---

## 4. Identidade Visual (The Digital Monolith)

A interface segue uma estética premium, tecnológica e profissional para se destacar no concurso:

* **Paleta de Cores**:
  - Fundo Geral: `#080e1a` (Azul escuro quase preto).
  - Cartões e Containers: `#121b2d` (Azul acinzentado de alta tecnologia).
  - Textos Primários: `#f1f5f9` (Branco suave para excelente legibilidade).
  - Textos Secundários: `#94a3b8` (Cinza neutro).
  - Destaques / CTAs: `#00e5ff` (Ciano neon futurista, transmitindo tecnologia).
  - Positivos (ROI positivo): `#10b981` (Verde esmeralda).
  - Negativos (ROI negativo / Perda): `#ef4444` (Vermelho coral).
* **Ausência de Bordas Rígidas**: Utilização de contraste de cores de fundo e sombras projetadas sutis para separar áreas, garantindo sofisticação.
* **Glassmorphism**: Efeitos de desfoque de fundo no cabeçalho fixo e caixas de diálogo (`backdrop-filter: blur(12px)` com opacidade de 80%).
