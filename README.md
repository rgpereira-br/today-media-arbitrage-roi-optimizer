# Today Media — Arbitrage & ROI Optimizer

> **Live Demo:** [https://today-media-arbitrage-roi-optimizer.vercel.app/](https://today-media-arbitrage-roi-optimizer.vercel.app/) *(Exemplo de link Vercel)*
> 
> **Amostras de Teste:** [amostra_custos_anuncios.csv](file:///g:/Meu%20Drive/Tech/R2P2%20Tech.AI/Projetos-Internos/r2p2-marketing-project-today-media/amostra_custos_anuncios.csv) & [amostra_receitas_afiliados.csv](file:///g:/Meu%20Drive/Tech/R2P2%20Tech.AI/Projetos-Internos/r2p2-marketing-project-today-media/amostra_receitas_afiliados.csv)

---

## 1. What does this tool do? // O que esta ferramenta faz?

**English:**
The **Today Media Arbitrage & ROI Optimizer** is a 100% client-side web application designed for media buyers and affiliate marketers. It solves the critical problem of attribution loss (caused by iOS 14+, adblockers, and tracking issues) by correlating traffic cost reports from ad networks (Meta, Google, Taboola, TikTok Ads) with revenue commission reports from affiliate networks (ClickBank, Hotmart, Shopify).
- **Smart Column Matching:** Automatically identifies columns for Campaigns, Spend, Date, and Revenue. Includes a visual fallback mapping interface for unsupported layouts.
- **Client-Side Processing:** All data parsing and correlation (Join) happen locally in the user's browser. Financial data never leaves their computer.
- **Interactive ROI Dashboard:** Visualizes daily spend vs. revenue curve using Chart.js.
- **AI Recommendation Engine:** Integrated with Gemini API to provide tactics such as scaling highly profitable campaigns or pausing money-losing ones. Includes an offline fallback simulator for instant evaluation.

**Português (Brasil):**
O **Today Media Arbitrage & ROI Optimizer** é um aplicativo web 100% client-side projetado para compradores de mídia e afiliados. Ele resolve o problema crítico de perda de atribuição correlacionando relatórios de custos de tráfego de redes de anúncios (Meta, Google, Taboola, TikTok Ads) com relatórios de receitas e comissões de redes de afiliados (ClickBank, Hotmart, Shopify).
- **Mapeamento Inteligente:** Identifica automaticamente colunas de Campanha, Custos, Datas e Receitas. Inclui interface visual de mapeamento caso a detecção automática falhe.
- **Processamento no Navegador:** Toda a consolidação e cálculos ocorrem localmente. Dados confidenciais nunca saem do computador do usuário.
- **Dashboard Dinâmico:** Visualização do ROI e gráficos de performance com Chart.js.
- **IA integrada:** Utiliza a API do Gemini para gerar sugestões acionáveis (pausar ou escalar orçamentos). Possui simulação inteligente offline caso nenhuma chave de API seja inserida.

---

## 2. Why did you build THIS one? // Por que você construiu ESTA ferramenta?

**English:**
In affiliate marketing and media buying at scale, **cash flow and fast decisions are everything**. 
Every day, a media buyer has to export CSVs from multiple sources and manually cross-reference them in Excel to calculate the real ROI of each campaign. Because tracking pixels fail constantly, the numbers inside Meta Ads or Google Ads are rarely accurate. Mismatches lead to two critical issues:
1. **Bleeding money** on campaigns that look profitable in the ad manager but have low conversions in the affiliate network.
2. **Missing scale opportunities** on campaigns that are performing well but show lower numbers in the ad manager due to iOS 14 tracking limitations.

By building a secure, local, drag-and-drop tool, I empower media buyers to get a **truthful, consolidated ROI view in under 5 seconds**, without compromising sensitive financial data by uploading it to external databases.

**Português (Brasil):**
No marketing de afiliados e compra de mídia em escala, **fluxo de caixa e decisões rápidas são tudo**.
Diariamente, um gestor de tráfego precisa exportar CSVs de várias fontes e cruzá-los manualmente no Excel para calcular o ROI real. Como os pixels de rastreamento falham constantemente, os números nos gerenciadores de anúncios raramente batem com as conversões reais na rede de afiliados. Isso causa dois problemas graves:
1. **Perda de dinheiro** em campanhas que parecem lucrativas no gerenciador de anúncios mas não vendem na rede de afiliado.
2. **Perda de escala** em campanhas que estão performando bem, mas mostram dados menores nos gerenciadores por restrições do iOS 14.

Ao criar uma ferramenta segura, local e do tipo drag-and-drop, permito que o media buyer obtenha uma **visão consolidada e real do ROI em menos de 5 segundos**, sem comprometer dados financeiros confidenciais subindo-os para servidores externos.

---

## 3. What would you build next if this were your full-time job? // O que você construiria a seguir se este fosse seu trabalho em tempo integral?

**English:**
If hired full-time as a Marketing Development Engineer at Today Media, my roadmap for this tool would be:
1. **Automation Workflows via MCP (Model Context Protocol):** Build MCP servers allowing local AI agents (like Claude or Gemini Desktop) to read these consolidated CSV files and automatically execute campaign adjustments (pause ads, increase budgets) directly in Meta/Google Ads via API.
2. **Continuous Sync Integration:** Implement secure local OAuth connectors with Meta, Google, and major affiliate APIs, allowing the user to refresh the dashboard with a single click without downloading CSVs manually.
3. **Advanced Attribution Modeling:** Build local statistical attribution algorithms (First Click, Last Click, Linear, and Time Decay) by analyzing click log parameters (GCLID, FBCLID, UTMs) to distribute revenue even when tracking links are partially broken.
4. **Landing Page Speed & SEO Autopilot:** Build a tool to automatically scrape our top-performing campaigns, analyze which page elements convert most, and auto-generate fresh, optimized variants of static HTML landing pages optimized for maximum load speed.

**Português (Brasil):**
Se contratado em tempo integral como Engenheiro de Desenvolvimento de Marketing na Today Media, meu roadmap para esta ferramenta seria:
1. **Automações de Mídia via MCP:** Criar servidores MCP para permitir que agentes locais de IA leiam os CSVs cruzados e executem alterações de campanha (pausar anúncios, ajustar orçamentos) diretamente nas APIs do Meta/Google Ads.
2. **Sincronização Direta sem Arquivos:** Integrar conectores OAuth locais com Meta, Google e APIs de afiliados para atualizar o painel com um clique, eliminando a necessidade de exportar planilhas manualmente.
3. **Modelagem de Atribuição Avançada:** Desenvolver algoritmos locais de atribuição (primeiro clique, último clique, linear) analisando parâmetros (GCLID, FBCLID, UTMs) para identificar a jornada do cliente mesmo quando o rastreamento principal estiver quebrado.
4. **Autopilot de Landing Pages:** Criar um gerador que analisa as campanhas mais lucrativas, identifica quais textos convertem mais, e gera automaticamente novas páginas estáticas em HTML ultra-rápidas para teste de conversão.

---

## 4. Tech Stack & Features // Tecnologias & Funcionalidades

*   **Structure:** Semantic HTML5 and premium dark-themed layout built under the **"The Digital Monolith"** design system specifications.
*   **Styling:** Custom Vanilla CSS3. High-contrast colors, Glassmorphism, smooth micro-interactions, completely Tailwind-free.
*   **Processing:** Client-Side `PapaParse` engine. No databases, zero external server tracking, fast rendering of files up to 10k rows.
*   **Charts:** Dynamic and responsive line charts built with `Chart.js`.
*   **Icons:** Scalable vector graphics from the `Lucide Icons` pack.
*   **AI Integration:** Raw data summaries sent securely to `Gemini API` (1.5 Flash) via client-side fetch.
