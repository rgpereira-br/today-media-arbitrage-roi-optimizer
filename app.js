// ---------------------------------------------------------
// Today Media ROI Optimizer - Application Logic (app.js)
// ---------------------------------------------------------

// Estado Global da Aplicação
const state = {
    costData: null,       // Dados brutos de custos (array de objetos)
    revenueData: null,    // Dados brutos de receitas (array de objetos)
    costHeaders: [],      // Cabeçalhos do arquivo de custos
    revenueHeaders: [],   // Cabeçalhos do arquivo de receitas
    
    // Mapeamento de colunas selecionado
    mapping: {
        cost: { campaign: '', spend: '', date: '', clicks: '' },
        revenue: { campaign: '', value: '', date: '', sales: '' }
    },
    
    // Dados processados
    results: {
        campaigns: {},    // Agrupamento por campanha
        daily: {},        // Agrupamento diário para o gráfico
        totals: {
            spend: 0,
            revenue: 0,
            profit: 0,
            roi: 0,
            clicks: 0,
            sales: 0
        }
    },
    
    chartInstance: null,  // Instância do Chart.js
    currentSort: { key: 'roi', desc: true } // Ordenação atual da tabela
};

// Termos comuns para mapeamento inteligente automático
const SEARCH_KEYWORDS = {
    cost: {
        campaign: ['campaign', 'campanha', 'campaign name', 'campaign_name', 'campaign id', 'ad set', 'adset', 'ad_set', 'ad name'],
        spend: ['spend', 'gasto', 'custo', 'cost', 'amount spent', 'amount_spent', 'valor gasto', 'investimento'],
        date: ['date', 'data', 'day', 'dia', 'reporting starts', 'reporting_starts', 'timestamp'],
        clicks: ['clicks', 'cliques', 'link clicks', 'link_clicks']
    },
    revenue: {
        campaign: ['campaign', 'campanha', 'utm_campaign', 'utm campaign', 'subid', 'subid1', 's1', 's2', 'tracking_id', 'tracking id', 'affiliate link'],
        value: ['revenue', 'receita', 'faturamento', 'value', 'amount', 'earnings', 'comissão', 'commission', 'payout', 'valor'],
        date: ['date', 'data', 'day', 'dia', 'timestamp', 'datetime', 'created_at', 'order date', 'order_date'],
        sales: ['sales', 'vendas', 'conversions', 'conversões', 'orders', 'transactions']
    }
};

// Dicionário de Canais e Fontes de Tráfego comuns para detecção automática
const TRAFFIC_SOURCES = ['meta', 'facebook', 'google', 'adwords', 'taboola', 'tiktok', 'bing', 'outbrain', 'pinterest'];

// Inicialização da UI e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initEventListeners();
    loadSavedApiKey();
});

// Configuração de Eventos
function initEventListeners() {
    // Cliques em Uploader manual
    document.querySelectorAll('.select-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uploadCard = e.target.closest('.upload-card');
            const fileInput = uploadCard.querySelector('input[type="file"]');
            fileInput.click();
        });
    });

    // Inputs de arquivos
    document.getElementById('file-cost').addEventListener('change', handleCostFileSelect);
    document.getElementById('file-revenue').addEventListener('change', handleRevenueFileSelect);

    // Botões de remoção de arquivos
    document.getElementById('clear-cost').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileInput('cost');
    });
    document.getElementById('clear-revenue').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileInput('revenue');
    });

    // Botão de processar mapeamento manual
    document.getElementById('btn-process-mapping').addEventListener('click', processManualMapping);

    // Botão de carregar dados de demonstração (Mock)
    document.getElementById('btn-load-mock-data').addEventListener('click', loadMockData);

    // Botão de exportação
    document.getElementById('btn-export-csv').addEventListener('click', exportConsolidatedCSV);

    // Botão de geração de IA
    document.getElementById('btn-generate-ai').addEventListener('click', generateAIRecommendations);

    // Modal de API Key
    const modal = document.getElementById('modal-api');
    document.getElementById('btn-api-settings').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // Links de navegação suave e ativação
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Ordenação da Tabela
    document.querySelectorAll('#campaign-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            const isDesc = state.currentSort.key === key ? !state.currentSort.desc : true;
            
            state.currentSort = { key, desc: isDesc };
            
            // Atualiza classes visuais nos cabeçalhos
            document.querySelectorAll('#campaign-table th').forEach(el => {
                el.classList.remove('active-sort');
                const icon = el.querySelector('.sort-icon');
                if (icon) icon.className = 'sort-icon';
            });
            
            th.classList.add('active-sort');
            const sortIcon = th.querySelector('.sort-icon');
            if (isDesc) {
                sortIcon.classList.add('desc');
            }
            
            renderCampaignTable();
        });
    });
}

// Inicializa Drag and Drop
function initDragAndDrop() {
    ['cost', 'revenue'].forEach(type => {
        const dropzone = document.getElementById(`dropzone-${type}`);
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
            }, false);
        });
        
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                const fileInput = document.getElementById(`file-${type}`);
                fileInput.files = files;
                if (type === 'cost') {
                    handleCostFileSelect({ target: fileInput });
                } else {
                    handleRevenueFileSelect({ target: fileInput });
                }
            }
        }, false);
    });
}

// Limpa inputs
function resetFileInput(type) {
    document.getElementById(`file-${type}`).value = '';
    document.getElementById(`info-${type}`).classList.add('hidden');
    document.getElementById(`dropzone-${type}`).querySelector('.select-file-btn').classList.remove('hidden');
    
    if (type === 'cost') state.costData = null;
    else state.revenueData = null;
    
    hideResultsAndMapping();
}

function hideResultsAndMapping() {
    document.getElementById('mapping-section').classList.add('hidden');
    document.querySelectorAll('.results-only').forEach(el => el.classList.add('hidden'));
}

// Manipuladores de arquivos
function handleCostFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    updateFileCard('cost', file.name);
    parseCSVFile(file, 'cost');
}

function handleRevenueFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    updateFileCard('revenue', file.name);
    parseCSVFile(file, 'revenue');
}

function updateFileCard(type, filename) {
    const dropzone = document.getElementById(`dropzone-${type}`);
    const infoBox = document.getElementById(`info-${type}`);
    const selectBtn = dropzone.querySelector('.select-file-btn');
    
    selectBtn.classList.add('hidden');
    infoBox.classList.remove('hidden');
    infoBox.querySelector('.file-name').textContent = filename;
}

// Parse de arquivos CSV usando PapaParse
function parseCSVFile(file, type) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                console.warn("Erros detectados no parse do CSV:", results.errors);
            }
            
            if (type === 'cost') {
                state.costData = results.data;
                state.costHeaders = results.meta.fields || [];
            } else {
                state.revenueData = results.data;
                state.revenueHeaders = results.meta.fields || [];
            }
            
            checkAndMapFiles();
        }
    });
}

// Análise e tentativa de Mapeamento Automático
function checkAndMapFiles() {
    if (!state.costData || !state.revenueData) return;
    
    // Tenta mapeamento inteligente para ambos
    const costMapped = autoMapColumns('cost', state.costHeaders);
    const revenueMapped = autoMapColumns('revenue', state.revenueHeaders);
    
    if (costMapped && revenueMapped) {
        // Se ambos mapearem com sucesso todas as colunas obrigatórias, processa direto
        document.getElementById('mapping-section').classList.add('hidden');
        processArbitrageData();
    } else {
        // Senão, exibe painel de mapeamento manual e preenche os selects
        setupManualMappingInterface();
    }
}

// Algoritmo de Mapeamento Automático Inteligente
function autoMapColumns(type, headers) {
    const mapping = state.mapping[type];
    const keywords = SEARCH_KEYWORDS[type];
    
    // Reseta mapeamentos anteriores
    for (const key in mapping) {
        mapping[key] = '';
    }
    
    // Tenta encontrar correspondências nos cabeçalhos
    headers.forEach(header => {
        const lowerHeader = String(header).toLowerCase().trim();
        
        for (const targetField in keywords) {
            // Se já achou para esse campo, pula
            if (mapping[targetField]) continue;
            
            // Procura correspondência direta ou por inclusão
            const match = keywords[targetField].some(keyword => {
                return lowerHeader === keyword || lowerHeader.includes(keyword);
            });
            
            if (match) {
                mapping[targetField] = header;
            }
        }
    });
    
    // Campos obrigatórios que precisam ser encontrados:
    // Custo: campaign, spend, date
    // Receita: campaign, value, date
    const hasRequired = mapping.campaign && mapping.date && (type === 'cost' ? mapping.spend : mapping.value);
    
    return hasRequired;
}

// Configura a tela de Mapeamento Manual
function setupManualMappingInterface() {
    const mappingSection = document.getElementById('mapping-section');
    mappingSection.classList.remove('hidden');
    document.querySelectorAll('.results-only').forEach(el => el.classList.add('hidden'));

    // Preenche selects de custos
    fillMappingSelect('map-cost-campaign', state.costHeaders, state.mapping.cost.campaign);
    fillMappingSelect('map-cost-spend', state.costHeaders, state.mapping.cost.spend);
    fillMappingSelect('map-cost-date', state.costHeaders, state.mapping.cost.date);
    fillMappingSelect('map-cost-clicks', state.costHeaders, state.mapping.cost.clicks, true);

    // Preenche selects de receitas
    fillMappingSelect('map-rev-campaign', state.revenueHeaders, state.mapping.revenue.campaign);
    fillMappingSelect('map-rev-value', state.revenueHeaders, state.mapping.revenue.value);
    fillMappingSelect('map-rev-date', state.revenueHeaders, state.mapping.revenue.date);
    fillMappingSelect('map-rev-sales', state.revenueHeaders, state.mapping.revenue.sales, true);
    
    // Rola para a seção
    mappingSection.scrollIntoView({ behavior: 'smooth' });
}

function fillMappingSelect(selectId, headers, selectedValue, isOptional = false) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    
    if (isOptional) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Não importar (Opcional) --';
        select.appendChild(opt);
    }
    
    headers.forEach(header => {
        const opt = document.createElement('option');
        opt.value = header;
        opt.textContent = header;
        if (header === selectedValue) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
    
    // Se não tinha valor mapeado automaticamente e não é opcional, seleciona o primeiro
    if (!selectedValue && !isOptional && headers.length > 0) {
        select.selectedIndex = 0;
    }
}

// Executa Mapeamento Manual do Formulário
function processManualMapping() {
    state.mapping.cost.campaign = document.getElementById('map-cost-campaign').value;
    state.mapping.cost.spend = document.getElementById('map-cost-spend').value;
    state.mapping.cost.date = document.getElementById('map-cost-date').value;
    state.mapping.cost.clicks = document.getElementById('map-cost-clicks').value;

    state.mapping.revenue.campaign = document.getElementById('map-rev-campaign').value;
    state.mapping.revenue.value = document.getElementById('map-rev-value').value;
    state.mapping.revenue.date = document.getElementById('map-rev-date').value;
    state.mapping.revenue.sales = document.getElementById('map-rev-sales').value;

    document.getElementById('mapping-section').classList.add('hidden');
    processArbitrageData();
}

// NORMALIZAÇÃO DE DATA
function parseDateString(dateStr) {
    if (!dateStr) return null;
    
    // Converte para string se for número
    dateStr = String(dateStr).trim();
    
    // Caso especial: ISO Date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10);
    }
    
    // Caso especial: DD/MM/YYYY ou MM/DD/YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        // Se o primeiro elemento tiver 4 dígitos, assume YYYY-MM-DD
        if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        
        // Verifica se é DD/MM/YYYY ou MM/DD/YYYY. Para ser robusto, assume que se o segundo elemento for maior que 12, o formato é MM/DD/YYYY
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parts[2].length === 2 ? '20' + parts[2] : parts[2]; // Ajusta ano curto
        
        if (p0 > 12) {
            // DD/MM/YYYY
            return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        } else if (p1 > 12) {
            // MM/DD/YYYY
            return `${p2}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        } else {
            // Padrão brasileiro DD/MM/YYYY
            return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
    }
    
    return null;
}

// LIMPEZA E FORMATAÇÃO DE NÚMEROS
function parseNumericValue(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    
    // Converte para string e remove caracteres de moeda
    let clean = String(value)
        .replace(/[$\sR€]/g, '') // remove símbolos monetários
        .trim();
        
    // Caso seja formato europeu/brasileiro (ex: 1.000,50 ou 1000,50)
    if (clean.includes(',') && clean.includes('.')) {
        // Se o ponto vier antes da vírgula (1.000,50)
        if (clean.indexOf('.') < clean.indexOf(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // Vírgula antes do ponto (1,000.50)
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        // Se tiver apenas vírgula (1000,50), assume decimal
        clean = clean.replace(',', '.');
    }
    
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}

// Tenta identificar a fonte de tráfego a partir do nome da campanha
function detectTrafficSource(campaignName) {
    const nameLower = String(campaignName).toLowerCase();
    
    for (const source of TRAFFIC_SOURCES) {
        if (nameLower.includes(source)) {
            return source.toUpperCase();
        }
    }
    
    // Fallback baseado em termos comuns
    if (nameLower.includes('fb') || nameLower.includes('instagram')) return 'META';
    if (nameLower.includes('gads') || nameLower.includes('search') || nameLower.includes('pmax')) return 'GOOGLE';
    if (nameLower.includes('tab') || nameLower.includes('native')) return 'TABOOLA';
    if (nameLower.includes('tt') || nameLower.includes('tok')) return 'TIKTOK';
    
    return 'OUTRAS';
}

// ALGORITMO PRINCIPAL DE PROCESSAMENTO E JUNÇÃO (JOIN)
function processArbitrageData() {
    // Reseta resultados
    state.results = {
        campaigns: {},
        daily: {},
        totals: { spend: 0, revenue: 0, profit: 0, roi: 0, clicks: 0, sales: 0 }
    };
    
    const costMap = state.mapping.cost;
    const revMap = state.mapping.revenue;
    
    // 1. Processar arquivo de custos (Popula as campanhas com investimento inicial)
    state.costData.forEach(row => {
        const campaignRaw = row[costMap.campaign];
        if (!campaignRaw) return;
        
        const campaign = String(campaignRaw).trim();
        const date = parseDateString(row[costMap.date]);
        const spend = parseNumericValue(row[costMap.spend]);
        const clicks = costMap.clicks ? parseInt(row[costMap.clicks]) || 0 : 0;
        
        if (!date) return;
        
        // Inicializa campanha no estado se não existir
        if (!state.results.campaigns[campaign]) {
            state.results.campaigns[campaign] = {
                name: campaign,
                source: detectTrafficSource(campaign),
                spend: 0,
                revenue: 0,
                clicks: 0,
                sales: 0,
                daily: {}
            };
        }
        
        // Agrupa dados da campanha
        const campObj = state.results.campaigns[campaign];
        campObj.spend += spend;
        campObj.clicks += clicks;
        
        // Agrupa dados diários da campanha
        if (!campObj.daily[date]) {
            campObj.daily[date] = { spend: 0, revenue: 0 };
        }
        campObj.daily[date].spend += spend;
        
        // Agrupa dados diários gerais para o gráfico
        if (!state.results.daily[date]) {
            state.results.daily[date] = { spend: 0, revenue: 0 };
        }
        state.results.daily[date].spend += spend;
        
        // Totais gerais
        state.results.totals.spend += spend;
        state.results.totals.clicks += clicks;
    });
    
    // 2. Processar arquivo de receitas (Cruza e adiciona o faturamento)
    state.revenueData.forEach(row => {
        const campaignRaw = row[revMap.campaign];
        if (!campaignRaw) return;
        
        const campaign = String(campaignRaw).trim();
        const date = parseDateString(row[revMap.date]);
        const revenue = parseNumericValue(row[revMap.value]);
        const sales = revMap.sales ? parseInt(row[revMap.sales]) || 0 : 1; // se não tiver coluna de vendas, assume 1 venda por linha
        
        if (!date) return;
        
        // Se a campanha não existia no arquivo de custos, cria ela
        if (!state.results.campaigns[campaign]) {
            state.results.campaigns[campaign] = {
                name: campaign,
                source: detectTrafficSource(campaign),
                spend: 0,
                revenue: 0,
                clicks: 0,
                sales: 0,
                daily: {}
            };
        }
        
        const campObj = state.results.campaigns[campaign];
        campObj.revenue += revenue;
        campObj.sales += sales;
        
        // Agrupa dados diários da campanha
        if (!campObj.daily[date]) {
            campObj.daily[date] = { spend: 0, revenue: 0 };
        }
        campObj.daily[date].revenue += revenue;
        
        // Agrupa dados diários gerais para o gráfico
        if (!state.results.daily[date]) {
            state.results.daily[date] = { spend: 0, revenue: 0 };
        }
        state.results.daily[date].revenue += revenue;
        
        // Totais gerais
        state.results.totals.revenue += revenue;
        state.results.totals.sales += sales;
    });
    
    // 3. Finalizar cálculos matemáticos de ROI e Lucro por campanha
    for (const name in state.results.campaigns) {
        const camp = state.results.campaigns[name];
        camp.profit = camp.revenue - camp.spend;
        camp.roi = camp.spend > 0 ? (camp.profit / camp.spend) * 100 : 100;
        camp.cpa = camp.sales > 0 ? camp.spend / camp.sales : 0;
    }
    
    // Totais Gerais
    const totals = state.results.totals;
    totals.profit = totals.revenue - totals.spend;
    totals.roi = totals.spend > 0 ? (totals.profit / totals.spend) * 100 : 0;
    
    // Exibe resultados na tela
    displayResults();
}

// ATUALIZA A INTERFACE DO USUÁRIO
function displayResults() {
    // Mostra seções
    document.querySelectorAll('.results-only').forEach(el => el.classList.remove('hidden'));
    
    // Atualiza Resumo Financeiro
    document.getElementById('stat-spend').textContent = formatCurrency(state.results.totals.spend);
    document.getElementById('stat-revenue').textContent = formatCurrency(state.results.totals.revenue);
    
    const profitEl = document.getElementById('stat-profit');
    profitEl.textContent = formatCurrency(state.results.totals.profit);
    profitEl.className = 'mono ' + (state.results.totals.profit >= 0 ? 'text-success' : 'text-danger');
    
    const roiEl = document.getElementById('stat-roi');
    roiEl.textContent = formatPercentage(state.results.totals.roi);
    roiEl.className = 'mono ' + (state.results.totals.roi >= 0 ? 'text-success' : 'text-danger');
    
    // Cliques e CPC
    const statClicks = document.getElementById('stat-clicks');
    const clicksWrapper = document.getElementById('stat-clicks-wrapper');
    if (state.results.totals.clicks > 0) {
        clicksWrapper.classList.remove('hidden');
        statClicks.textContent = state.results.totals.clicks.toLocaleString();
        const cpc = state.results.totals.spend / state.results.totals.clicks;
        document.getElementById('stat-cpc').textContent = formatCurrency(cpc);
    } else {
        clicksWrapper.classList.add('hidden');
    }
    
    // Vendas e Ticket Médio
    const statSales = document.getElementById('stat-sales');
    const salesWrapper = document.getElementById('stat-sales-wrapper');
    if (state.results.totals.sales > 0) {
        salesWrapper.classList.remove('hidden');
        statSales.textContent = state.results.totals.sales.toLocaleString();
        const ticket = state.results.totals.revenue / state.results.totals.sales;
        document.getElementById('stat-ticket').textContent = formatCurrency(ticket);
    } else {
        salesWrapper.classList.add('hidden');
    }
    
    // Desenha Gráficos e Tabelas
    renderPerformanceChart();
    renderCampaignTable();
    
    // Rola suavemente para o dashboard
    document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
}

// FORMATAÇÕES DE UI
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatPercentage(val) {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
}

// PLOTAGEM DE GRÁFICO (CHART.JS)
function renderPerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Destrói gráfico anterior se houver
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }
    
    // Ordena as datas cronologicamente
    const sortedDates = Object.keys(state.results.daily).sort();
    const spendData = [];
    const revenueData = [];
    const profitData = [];
    
    sortedDates.forEach(date => {
        const day = state.results.daily[date];
        spendData.push(day.spend);
        revenueData.push(day.revenue);
        profitData.push(day.revenue - day.spend);
    });
    
    // Converte datas para exibição legível (DD/MM)
    const labels = sortedDates.map(d => {
        const parts = d.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Investimento (Gasto)',
                    data: spendData,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Receita (Faturamento)',
                    data: revenueData,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Lucro Líquido',
                    data: profitData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono', size: 11 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#101826',
                    titleColor: '#00e5ff',
                    bodyColor: '#f1f5f9',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'Hanken Grotesk' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono', size: 10 },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// ATUALIZA A TABELA DE CAMPANHAS
function renderCampaignTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    // Converte objeto de campanhas em array
    const campaignsArray = Object.values(state.results.campaigns);
    
    // Ordenação dos dados
    const sortKey = state.currentSort.key;
    const isDesc = state.currentSort.desc;
    
    campaignsArray.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        
        // Trata ordenações de strings de forma insensível a maiúsculas
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
    });
    
    // Popular linhas
    campaignsArray.forEach(camp => {
        const tr = document.createElement('tr');
        
        const profitClass = camp.profit >= 0 ? 'text-success' : 'text-danger';
        const roiClass = camp.roi >= 0 ? 'text-success' : 'text-danger';
        const statusBadgeClass = camp.roi >= 15 ? 'success' : 'danger';
        const statusText = camp.roi >= 15 ? 'ESCALÁVEL' : (camp.roi >= 0 ? 'ESTÁVEL' : 'VENDAS NEGATIVAS');
        
        tr.innerHTML = `
            <td>
                <div class="campaign-name-cell">
                    <strong>${camp.name}</strong>
                    <span class="source-tag">${camp.source}</span>
                </div>
            </td>
            <td class="mono">${formatCurrency(camp.spend)}</td>
            <td class="mono">${formatCurrency(camp.revenue)}</td>
            <td class="mono ${profitClass}">${formatCurrency(camp.profit)}</td>
            <td class="mono ${roiClass}">${formatPercentage(camp.roi)}</td>
            <td class="mono">${camp.cpa > 0 ? formatCurrency(camp.cpa) : 'N/A'}</td>
            <td>
                <span class="status-badge ${statusBadgeClass}">${statusText}</span>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// EXPORTAÇÃO DO RELATÓRIO EM CSV
function exportConsolidatedCSV() {
    const campaigns = Object.values(state.results.campaigns);
    if (campaigns.length === 0) return;
    
    // Prepara dados
    const headers = ['Campanha', 'Fonte', 'Investimento (Gasto)', 'Receita (Faturamento)', 'Lucro Liquido', 'ROI (%)', 'CPA', 'Cliques', 'Conversões'];
    const rows = campaigns.map(c => [
        c.name,
        c.source,
        c.spend.toFixed(2),
        c.revenue.toFixed(2),
        c.profit.toFixed(2),
        c.roi.toFixed(2),
        c.cpa.toFixed(2),
        c.clicks,
        c.sales
    ]);
    
    const csvContent = Papa.unparse({ fields: headers, data: rows });
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "relatorio_roi_consolidado.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// INTEGRAÇÃO COM GEMINI API
async function generateAIRecommendations() {
    const aiResponseContainer = document.getElementById('ai-response');
    aiResponseContainer.innerHTML = `
        <div class="ai-welcome-state">
            <i class="lucide-loader-2 brain-glow animate-spin"></i>
            <h3>Analisando Dados de Arbitragem...</h3>
            <p>O Gemini está processando as métricas de suas campanhas para formular as melhores táticas de otimização.</p>
        </div>
    `;
    
    const key = localStorage.getItem('gemini_api_key');
    
    // Prepara dados estatísticos formatados para a IA
    const topCampaigns = Object.values(state.results.campaigns)
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);
        
    let promptData = `Abaixo estão as 10 principais campanhas de tráfego pago da Today Media que cruzamos com a receita de afiliados.
Métricas Gerais:
- Gasto Total: ${formatCurrency(state.results.totals.spend)}
- Receita Total: ${formatCurrency(state.results.totals.revenue)}
- Lucro Líquido: ${formatCurrency(state.results.totals.profit)}
- ROI Médio Geral: ${formatPercentage(state.results.totals.roi)}

Lista de Campanhas detalhadas:
`;
    
    topCampaigns.forEach(c => {
        promptData += `- Campanha "${c.name}" [Fonte: ${c.source}]: Gasto ${formatCurrency(c.spend)}, Receita ${formatCurrency(c.revenue)}, Lucro ${formatCurrency(c.profit)}, ROI ${formatPercentage(c.roi)}, CPA ${c.cpa > 0 ? formatCurrency(c.cpa) : 'N/A'}, Conversões: ${c.sales}\n`;
    });
    
    promptData += `\nAja como um experiente Diretor de Media Buying (Compra de Tráfego). Dê recomendações altamente acionáveis divididas em:
1. Campanhas para Escalar (Altamente rentáveis)
2. Campanhas para Otimizar ou Cortar (Prejuízo ou ROI negativo)
3. Sugestão geral de alocação de orçamento para maximizar a arbitragem.

Gere os títulos e recomendações em Português do Brasil, de forma muito direta, profissional e focada em resultados financeiros (completamente livre de enrolação corporativa genérica).`;

    if (key) {
        // Chamada real para a API do Gemini
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptData }] }]
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                const markdownText = data.candidates[0].content.parts[0].text;
                renderMarkdownReport(markdownText);
            } else {
                throw new Error(data.error?.message || "Erro na geração do conteúdo.");
            }
        } catch (error) {
            console.error("Erro na chamada da API:", error);
            renderOfflineSimulation(topCampaigns, "Erro na API Key. Exibindo análise local simulada:");
        }
    } else {
        // Sem API Key: Simulação Local Inteligente baseada nos dados reais carregados
        setTimeout(() => {
            renderOfflineSimulation(topCampaigns);
        }, 1500);
    }
}

// GERAÇÃO DE RELATÓRIO OFFLINE (SIMULAÇÃO INTELIGENTE LOCAL)
function renderOfflineSimulation(topCampaigns, customTitle = null) {
    const aiResponseContainer = document.getElementById('ai-response');
    
    const scalables = topCampaigns.filter(c => c.roi >= 15);
    const criticals = topCampaigns.filter(c => c.roi < 0);
    
    let html = `
        <div class="ai-report">
            <div class="status-badge ${customTitle ? 'danger' : 'success'}" style="margin-bottom: 16px;">
                ${customTitle || 'MODO DE SIMULAÇÃO LOCAL (Offline)'}
            </div>
            
            <h4><i data-lucide="trending-up"></i> Campanhas Recomendadas para Escalar</h4>
            <ul>
    `;
    
    if (scalables.length > 0) {
        scalables.forEach(c => {
            html += `
                <li>
                    <strong>${c.name} (${c.source})</strong>: Com ROI de <strong>${formatPercentage(c.roi)}</strong> e Lucro Líquido de <strong>${formatCurrency(c.profit)}</strong>, esta campanha é uma excelente candidata à escala. 
                    <em>Ação tática:</em> Aumente o orçamento diário em 15% a 20% a cada 48 horas enquanto o CPA se mantiver abaixo de ${c.cpa > 0 ? formatCurrency(c.cpa * 1.15) : 'valor aceitável'}.
                </li>
            `;
        });
    } else {
        html += `<li>Nenhuma campanha com ROI superior a +15% foi detectada para escala direta imediata neste lote.</li>`;
    }
    
    html += `
            </ul>
            
            <h4><i data-lucide="alert-triangle"></i> Campanhas Críticas (Pausar ou Otimizar)</h4>
            <ul>
    `;
    
    if (criticals.length > 0) {
        criticals.forEach(c => {
            html += `
                <li>
                    <strong>${c.name} (${c.source})</strong>: ROI negativo de <strong>${formatPercentage(c.roi)}</strong> representando um prejuízo líquido de <strong>${formatCurrency(c.profit)}</strong>. 
                    <em>Ação tática:</em> Pause a campanha imediatamente ou reduza o orçamento para o mínimo de teste. Verifique se há falhas no funil de vendas da landing page ou se o criativo saturou.
                </li>
            `;
        });
    } else {
        html += `<li>Excelente! Nenhuma campanha com prejuízo (ROI negativo) foi detectada neste lote.</li>`;
    }
    
    html += `
            </ul>
            
            <h4><i data-lucide="sliders"></i> Diretrizes Gerais de Arbitragem</h4>
            <p>Com base nos dados analisados, sua operação possui um ROI geral de <strong>${formatPercentage(state.results.totals.roi)}</strong> com um lucro líquido de <strong>${formatCurrency(state.results.totals.profit)}</strong>. Recomenda-se redirecionar a verba liberada das campanhas pausadas diretamente para as fontes que estão gerando arbitragem positiva para otimizar o fluxo de caixa diário.</p>
        </div>
    `;
    
    aiResponseContainer.innerHTML = html;
    lucide.createIcons();
}

// Renderiza a resposta em Markdown vinda do Gemini em HTML simples estruturado
function renderMarkdownReport(mdText) {
    const aiResponseContainer = document.getElementById('ai-response');
    
    // Conversor extremamente básico de Markdown para HTML estruturado para evitar bibliotecas extras
    let html = mdText
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/## (.*)/g, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\* (.*)/gm, '<li>$1</li>')
        .replace(/^\- (.*)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/<\/li>\n<li>/g, '</li><li>');
        
    // Envolve listas
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    
    aiResponseContainer.innerHTML = `<div class="ai-report">${html}</div>`;
    
    // Adiciona ícones adequados aos títulos criados pelo parser
    document.querySelectorAll('.ai-report h4').forEach(h4 => {
        const text = h4.textContent.toLowerCase();
        let icon = 'sparkles';
        if (text.includes('escalar') || text.includes('aumentar') || text.includes('positivo')) icon = 'trending-up';
        else if (text.includes('pausar') || text.includes('cortar') || text.includes('crítica') || text.includes('prejuízo')) icon = 'alert-triangle';
        else if (text.includes('diretrizes') || text.includes('alocação') || text.includes('orçamento')) icon = 'sliders';
        
        h4.innerHTML = `<i data-lucide="${icon}"></i> ` + h4.innerHTML;
    });
    
    lucide.createIcons();
}

// GERENCIAMENTO DA API KEY NO LOCALSTORAGE
function saveApiKey() {
    const input = document.getElementById('input-api-key').value.trim();
    if (input) {
        localStorage.setItem('gemini_api_key', input);
        alert('Chave API salva localmente com sucesso!');
    } else {
        localStorage.removeItem('gemini_api_key');
        alert('Chave API removida. A IA rodará no modo de simulação local.');
    }
    document.getElementById('modal-api').classList.add('hidden');
    loadSavedApiKey();
}

function loadSavedApiKey() {
    const key = localStorage.getItem('gemini_api_key');
    const btn = document.getElementById('btn-api-settings');
    const input = document.getElementById('input-api-key');
    
    if (key) {
        btn.classList.add('btn-outline');
        btn.classList.remove('btn-secondary');
        btn.querySelector('span').textContent = 'API Key Configurada';
        input.value = key;
    } else {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-secondary');
        btn.querySelector('span').textContent = 'Chave Gemini API';
        input.value = '';
    }
}

// DADOS DE DEMONSTRAÇÃO DE MOCK (TESTE SEM ARQUIVOS)
function loadMockData() {
    // 1. Mock de Dados de Custos
    state.costData = [
        { "Campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-01", "Spend": 1250.00, "Clicks": 850 },
        { "Campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-02", "Spend": 1310.00, "Clicks": 920 },
        { "Campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-03", "Spend": 1180.00, "Clicks": 810 },
        
        { "Campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-01", "Spend": 450.00, "Clicks": 210 },
        { "Campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-02", "Spend": 480.00, "Clicks": 230 },
        { "Campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-03", "Spend": 520.00, "Clicks": 250 },
        
        { "Campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-01", "Spend": 850.00, "Clicks": 3400 },
        { "Campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-02", "Spend": 900.00, "Clicks": 3800 },
        { "Campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-03", "Spend": 920.00, "Clicks": 3950 },
        
        { "Campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-01", "Spend": 1600.00, "Clicks": 2200 },
        { "Campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-02", "Spend": 1800.00, "Clicks": 2500 },
        { "Campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-03", "Spend": 2100.00, "Clicks": 2900 }
    ];
    state.costHeaders = ["Campaign", "Date", "Spend", "Clicks"];

    // 2. Mock de Dados de Receitas
    state.revenueData = [
        { "utm_campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-01", "Payout": 2450.00, "Sales": 49 },
        { "utm_campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-02", "Payout": 2900.00, "Sales": 58 },
        { "utm_campaign": "META_USA_Lookalike_Purchases", "Date": "2026-07-03", "Payout": 2750.00, "Sales": 55 },
        
        { "utm_campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-01", "Payout": 120.00, "Sales": 2 },
        { "utm_campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-02", "Payout": 90.00, "Sales": 1 },
        { "utm_campaign": "GOOGLE_Search_Brand_Today", "Date": "2026-07-03", "Payout": 150.00, "Sales": 3 },
        
        { "utm_campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-01", "Payout": 720.00, "Sales": 18 },
        { "utm_campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-02", "Payout": 1100.00, "Sales": 27 },
        { "utm_campaign": "TABOOLA_Brazil_Native_LeadGen", "Date": "2026-07-03", "Payout": 950.00, "Sales": 24 },
        
        { "utm_campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-01", "Payout": 1850.00, "Sales": 37 },
        { "utm_campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-02", "Payout": 1950.00, "Sales": 39 },
        { "utm_campaign": "TIKTOK_USA_Video_Trends", "Date": "2026-07-03", "Payout": 2150.00, "Sales": 43 }
    ];
    state.revenueHeaders = ["utm_campaign", "Date", "Payout", "Sales"];

    // Mostra que os arquivos foram carregados nos cards
    updateFileCard('cost', 'dados_custo_demonstracao.csv');
    updateFileCard('revenue', 'dados_receita_demonstracao.csv');

    // Executa mapeamento automático
    state.mapping.cost = { campaign: 'Campaign', spend: 'Spend', date: 'Date', clicks: 'Clicks' };
    state.mapping.revenue = { campaign: 'utm_campaign', value: 'Payout', date: 'Date', sales: 'Sales' };

    document.getElementById('mapping-section').classList.add('hidden');
    processArbitrageData();
}
