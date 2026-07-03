// ---------------------------------------------------------
// Today Media ROI Optimizer - Application Logic (app.js)
// ---------------------------------------------------------

// Global Application State
const state = {
    costData: null,       // Raw cost data (array of objects)
    revenueData: null,    // Raw revenue data (array of objects)
    costHeaders: [],      // Cost file headers
    revenueHeaders: [],   // Revenue file headers
    
    // Mapped columns selection
    mapping: {
        cost: { campaign: '', spend: '', date: '', clicks: '' },
        revenue: { campaign: '', value: '', date: '', sales: '' }
    },
    
    // Processed output data
    results: {
        campaigns: {},    // Grouping by campaign
        daily: {},        // Daily grouping for the chart
        totals: {
            spend: 0,
            revenue: 0,
            profit: 0,
            roi: 0,
            clicks: 0,
            sales: 0
        }
    },
    
    chartInstance: null,  // Chart.js instance
    currentSort: { key: 'roi', desc: true } // Current table sort configuration
};

// Common terms for automatic smart column mapping
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

// Traffic sources dictionary for auto-detection
const TRAFFIC_SOURCES = ['meta', 'facebook', 'google', 'adwords', 'taboola', 'tiktok', 'bing', 'outbrain', 'pinterest'];

// Initialize UI and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initEventListeners();
    loadSavedApiKey();
});

// Event Listeners Configuration
function initEventListeners() {
    // Click on manual select button in dropzones
    document.querySelectorAll('.select-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uploadCard = e.target.closest('.upload-card');
            const fileInput = uploadCard.querySelector('input[type="file"]');
            fileInput.click();
        });
    });

    // File Input Changes
    document.getElementById('file-cost').addEventListener('change', handleCostFileSelect);
    document.getElementById('file-revenue').addEventListener('change', handleRevenueFileSelect);

    // Clear File Buttons
    document.getElementById('clear-cost').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileInput('cost');
    });
    document.getElementById('clear-revenue').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileInput('revenue');
    });

    // Process Manual Mapping Button
    document.getElementById('btn-process-mapping').addEventListener('click', processManualMapping);

    // Load Mock Data Button
    document.getElementById('btn-load-mock-data').addEventListener('click', loadMockData);

    // Export Merged CSV Button
    document.getElementById('btn-export-csv').addEventListener('click', exportConsolidatedCSV);

    // Generate AI Recommendations Button
    document.getElementById('btn-generate-ai').addEventListener('click', generateAIRecommendations);

    // API Key Modal Configuration
    const modal = document.getElementById('modal-api');
    document.getElementById('btn-api-settings').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
    
    // Close modal clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // Smooth navigation links activation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Table Column Sorting Events
    document.querySelectorAll('#campaign-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            const isDesc = state.currentSort.key === key ? !state.currentSort.desc : true;
            
            state.currentSort = { key, desc: isDesc };
            
            // Clear current sorted classes
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

// Drag and Drop Events Configuration
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

// Clear File Input State
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

// File Select Handlers
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

// CSV File Parser via PapaParse
function parseCSVFile(file, type) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                console.warn("Errors found during CSV parsing:", results.errors);
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

// Check Ingestion Status and Auto-Map Columns
function checkAndMapFiles() {
    if (!state.costData || !state.revenueData) return;
    
    const costMapped = autoMapColumns('cost', state.costHeaders);
    const revenueMapped = autoMapColumns('revenue', state.revenueHeaders);
    
    if (costMapped && revenueMapped) {
        document.getElementById('mapping-section').classList.add('hidden');
        processArbitrageData();
    } else {
        setupManualMappingInterface();
    }
}

// Smart Auto-Mapping Algorithm
function autoMapColumns(type, headers) {
    const mapping = state.mapping[type];
    const keywords = SEARCH_KEYWORDS[type];
    
    for (const key in mapping) {
        mapping[key] = '';
    }
    
    headers.forEach(header => {
        const lowerHeader = String(header).toLowerCase().trim();
        
        for (const targetField in keywords) {
            if (mapping[targetField]) continue;
            
            const match = keywords[targetField].some(keyword => {
                return lowerHeader === keyword || lowerHeader.includes(keyword);
            });
            
            if (match) {
                mapping[targetField] = header;
            }
        }
    });
    
    const hasRequired = mapping.campaign && mapping.date && (type === 'cost' ? mapping.spend : mapping.value);
    return hasRequired;
}

// Manual Mapping Setup UI
function setupManualMappingInterface() {
    const mappingSection = document.getElementById('mapping-section');
    mappingSection.classList.remove('hidden');
    document.querySelectorAll('.results-only').forEach(el => el.classList.add('hidden'));

    // Fill Cost Dropdowns
    fillMappingSelect('map-cost-campaign', state.costHeaders, state.mapping.cost.campaign);
    fillMappingSelect('map-cost-spend', state.costHeaders, state.mapping.cost.spend);
    fillMappingSelect('map-cost-date', state.costHeaders, state.mapping.cost.date);
    fillMappingSelect('map-cost-clicks', state.costHeaders, state.mapping.cost.clicks, true);

    // Fill Revenue Dropdowns
    fillMappingSelect('map-rev-campaign', state.revenueHeaders, state.mapping.revenue.campaign);
    fillMappingSelect('map-rev-value', state.revenueHeaders, state.mapping.revenue.value);
    fillMappingSelect('map-rev-date', state.revenueHeaders, state.mapping.revenue.date);
    fillMappingSelect('map-rev-sales', state.revenueHeaders, state.mapping.revenue.sales, true);
    
    mappingSection.scrollIntoView({ behavior: 'smooth' });
}

function fillMappingSelect(selectId, headers, selectedValue, isOptional = false) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    
    if (isOptional) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Optional (Do not import) --';
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
    
    if (!selectedValue && !isOptional && headers.length > 0) {
        select.selectedIndex = 0;
    }
}

// Process Custom Selected Form Mappings
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

// DATE NORMALIZATION ROUTINE
function parseDateString(dateStr) {
    if (!dateStr) return null;
    dateStr = String(dateStr).trim();
    
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10);
    }
    
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        
        if (p0 > 12) {
            return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        } else if (p1 > 12) {
            return `${p2}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        } else {
            return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
    }
    return null;
}

// CURRENCY & NUMERIC CLEANING ROUTINE
function parseNumericValue(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    
    let clean = String(value)
        .replace(/[$\sR€]/g, '')
        .trim();
        
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf('.') < clean.indexOf(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}

// Traffic Source Auto-Detection
function detectTrafficSource(campaignName) {
    const nameLower = String(campaignName).toLowerCase();
    
    for (const source of TRAFFIC_SOURCES) {
        if (nameLower.includes(source)) {
            return source.toUpperCase();
        }
    }
    
    if (nameLower.includes('fb') || nameLower.includes('instagram')) return 'META';
    if (nameLower.includes('gads') || nameLower.includes('search') || nameLower.includes('pmax')) return 'GOOGLE';
    if (nameLower.includes('tab') || nameLower.includes('native')) return 'TABOOLA';
    if (nameLower.includes('tt') || nameLower.includes('tok')) return 'TIKTOK';
    
    return 'OTHER';
}

// MAIN DATA MATCHING AND MERGE ENGINE (JOIN)
function processArbitrageData() {
    state.results = {
        campaigns: {},
        daily: {},
        totals: { spend: 0, revenue: 0, profit: 0, roi: 0, clicks: 0, sales: 0 }
    };
    
    const costMap = state.mapping.cost;
    const revMap = state.mapping.revenue;
    
    // 1. Process Traffic Cost File (Initialize Campaigns)
    state.costData.forEach(row => {
        const campaignRaw = row[costMap.campaign];
        if (!campaignRaw) return;
        
        const campaign = String(campaignRaw).trim();
        const date = parseDateString(row[costMap.date]);
        const spend = parseNumericValue(row[costMap.spend]);
        const clicks = costMap.clicks ? parseInt(row[costMap.clicks]) || 0 : 0;
        
        if (!date) return;
        
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
        campObj.spend += spend;
        campObj.clicks += clicks;
        
        if (!campObj.daily[date]) {
            campObj.daily[date] = { spend: 0, revenue: 0 };
        }
        campObj.daily[date].spend += spend;
        
        if (!state.results.daily[date]) {
            state.results.daily[date] = { spend: 0, revenue: 0 };
        }
        state.results.daily[date].spend += spend;
        
        state.results.totals.spend += spend;
        state.results.totals.clicks += clicks;
    });
    
    // 2. Process Revenue File (Cross-Reference Campaigns)
    state.revenueData.forEach(row => {
        const campaignRaw = row[revMap.campaign];
        if (!campaignRaw) return;
        
        const campaign = String(campaignRaw).trim();
        const date = parseDateString(row[revMap.date]);
        const revenue = parseNumericValue(row[revMap.value]);
        const sales = revMap.sales ? parseInt(row[revMap.sales]) || 0 : 1; 
        
        if (!date) return;
        
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
        
        if (!campObj.daily[date]) {
            campObj.daily[date] = { spend: 0, revenue: 0 };
        }
        campObj.daily[date].revenue += revenue;
        
        if (!state.results.daily[date]) {
            state.results.daily[date] = { spend: 0, revenue: 0 };
        }
        state.results.daily[date].revenue += revenue;
        
        state.results.totals.revenue += revenue;
        state.results.totals.sales += sales;
    });
    
    // 3. Perform Calculations (ROI, Profits, CPAs)
    for (const name in state.results.campaigns) {
        const camp = state.results.campaigns[name];
        camp.profit = camp.revenue - camp.spend;
        camp.roi = camp.spend > 0 ? (camp.profit / camp.spend) * 100 : 100;
        camp.cpa = camp.sales > 0 ? camp.spend / camp.sales : 0;
    }
    
    const totals = state.results.totals;
    totals.profit = totals.revenue - totals.spend;
    totals.roi = totals.spend > 0 ? (totals.profit / totals.spend) * 100 : 0;
    
    displayResults();
}

// UPDATE INTERFACE
function displayResults() {
    document.querySelectorAll('.results-only').forEach(el => el.classList.remove('hidden'));
    
    document.getElementById('stat-spend').textContent = formatCurrency(state.results.totals.spend);
    document.getElementById('stat-revenue').textContent = formatCurrency(state.results.totals.revenue);
    
    const profitEl = document.getElementById('stat-profit');
    profitEl.textContent = formatCurrency(state.results.totals.profit);
    profitEl.className = 'mono ' + (state.results.totals.profit >= 0 ? 'text-success' : 'text-danger');
    
    const roiEl = document.getElementById('stat-roi');
    roiEl.textContent = formatPercentage(state.results.totals.roi);
    roiEl.className = 'mono ' + (state.results.totals.roi >= 0 ? 'text-success' : 'text-danger');
    
    // Clicks & CPC
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
    
    // Sales & AOV (Ticket)
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
    
    // Render Charts and Tables
    renderPerformanceChart();
    renderCampaignTable();
    
    document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
}

// UI FORMATTING UTILS
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatPercentage(val) {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
}

// PERFORMANCE CHART PLOT (CHART.JS)
function renderPerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }
    
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
    
    const labels = sortedDates.map(d => {
        const parts = d.split('-');
        return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d; // MM/DD format
    });

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Traffic Spend',
                    data: spendData,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Affiliate Revenue',
                    data: revenueData,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Net Profit',
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

// POPULATE CAMPAIGN LISTINGS TABLE
function renderCampaignTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    const campaignsArray = Object.values(state.results.campaigns);
    const sortKey = state.currentSort.key;
    const isDesc = state.currentSort.desc;
    
    campaignsArray.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
    });
    
    campaignsArray.forEach(camp => {
        const tr = document.createElement('tr');
        
        const profitClass = camp.profit >= 0 ? 'text-success' : 'text-danger';
        const roiClass = camp.roi >= 0 ? 'text-success' : 'text-danger';
        const statusBadgeClass = camp.roi >= 15 ? 'success' : 'danger';
        const statusText = camp.roi >= 15 ? 'SCALABLE' : (camp.roi >= 0 ? 'STABLE' : 'NEGATIVE ROI');
        
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

// EXPORT MERGED REPORT IN CSV
function exportConsolidatedCSV() {
    const campaigns = Object.values(state.results.campaigns);
    if (campaigns.length === 0) return;
    
    const headers = ['Campaign', 'Source', 'Traffic Spend', 'Affiliate Revenue', 'Net Profit', 'ROI (%)', 'CPA', 'Clicks', 'Conversions'];
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
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "consolidated_roi_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// GEMINI AI INTEGRATION
async function generateAIRecommendations() {
    const aiResponseContainer = document.getElementById('ai-response');
    aiResponseContainer.innerHTML = `
        <div class="ai-welcome-state">
            <i class="lucide-loader-2 brain-glow animate-spin"></i>
            <h3>Analyzing Arbitrage Data...</h3>
            <p>Gemini is processing campaign metrics to formulate tactical optimization advice.</p>
        </div>
    `;
    
    const key = localStorage.getItem('gemini_api_key');
    
    const topCampaigns = Object.values(state.results.campaigns)
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);
        
    let promptData = `Below are the top 10 paid traffic campaigns from Today Media correlated with affiliate revenue.
Overall Metrics:
- Total Spend: ${formatCurrency(state.results.totals.spend)}
- Total Revenue: ${formatCurrency(state.results.totals.revenue)}
- Net Profit: ${formatCurrency(state.results.totals.profit)}
- Average ROI: ${formatPercentage(state.results.totals.roi)}

Detailed Campaigns List:
`;
    
    topCampaigns.forEach(c => {
        promptData += `- Campaign "${c.name}" [Source: ${c.source}]: Spend ${formatCurrency(c.spend)}, Revenue ${formatCurrency(c.revenue)}, Profit ${formatCurrency(c.profit)}, ROI ${formatPercentage(c.roi)}, CPA ${c.cpa > 0 ? formatCurrency(c.cpa) : 'N/A'}, Conversions: ${c.sales}\n`;
    });
    
    promptData += `\nAct as an experienced Media Buying Director. Provide highly actionable recommendations split into:
1. Campaigns to Scale (Highly profitable)
2. Campaigns to Optimize or Pause (Negative ROI)
3. Overall budget allocation advice to maximize arbitrage.

Write the report in English, in a direct, professional, and performance-focused tone (completely free of corporate fluff).`;

    if (key) {
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
                throw new Error(data.error?.message || "Failed to generate AI content.");
            }
        } catch (error) {
            console.error("API Call Error:", error);
            renderOfflineSimulation(topCampaigns, "API Key Error. Showing offline local simulation:");
        }
    } else {
        // Local Simulation mode
        setTimeout(() => {
            renderOfflineSimulation(topCampaigns);
        }, 1500);
    }
}

// OFFLINE MOCK AI SIMULATOR
function renderOfflineSimulation(topCampaigns, customTitle = null) {
    const aiResponseContainer = document.getElementById('ai-response');
    
    const scalables = topCampaigns.filter(c => c.roi >= 15);
    const criticals = topCampaigns.filter(c => c.roi < 0);
    
    let html = `
        <div class="ai-report">
            <div class="status-badge ${customTitle ? 'danger' : 'success'}" style="margin-bottom: 16px;">
                ${customTitle || 'OFFLINE SIMULATION MODE'}
            </div>
            
            <h4><i data-lucide="trending-up"></i> Recommended Campaigns to Scale</h4>
            <ul>
    `;
    
    if (scalables.length > 0) {
        scalables.forEach(c => {
            html += `
                <li>
                    <strong>${c.name} (${c.source})</strong>: Performing at <strong>${formatPercentage(c.roi)} ROI</strong> with a net profit of <strong>${formatCurrency(c.profit)}</strong>. 
                    <em>Tactical Action:</em> Increase the daily budget by 15% to 20% every 48 hours as long as CPA remains stable below ${c.cpa > 0 ? formatCurrency(c.cpa * 1.15) : 'acceptable target'}.
                </li>
            `;
        });
    } else {
        html += `<li>No campaigns with ROI above +15% detected for direct immediate scaling in this batch.</li>`;
    }
    
    html += `
            </ul>
            
            <h4><i data-lucide="alert-triangle"></i> Critical Campaigns (Pause or Optimize)</h4>
            <ul>
    `;
    
    if (criticals.length > 0) {
        criticals.forEach(c => {
            html += `
                <li>
                    <strong>${c.name} (${c.source})</strong>: Operating at a negative <strong>${formatPercentage(c.roi)} ROI</strong> representing a net loss of <strong>${formatCurrency(c.profit)}</strong>. 
                    <em>Tactical Action:</em> Pause this campaign immediately or lower its budget to minimum test levels. Audit the landing page funnel and ad creatives for saturation.
                </li>
            `;
        });
    } else {
        html += `<li>Excellent! No campaigns with negative ROI detected in this batch.</li>`;
    }
    
    html += `
            </ul>
            
            <h4><i data-lucide="sliders"></i> General Arbitrage Guidelines</h4>
            <p>Based on the ingestion batch, your operation has an overall ROI of <strong>${formatPercentage(state.results.totals.roi)}</strong> with a net profit of <strong>${formatCurrency(state.results.totals.profit)}</strong>. Redirect ad budgets from paused campaigns directly into scalable positive assets to maximize cash flow velocity.</p>
        </div>
    `;
    
    aiResponseContainer.innerHTML = html;
    lucide.createIcons();
}

// Convert Gemini Markdown output to simple HTML tags
function renderMarkdownReport(mdText) {
    const aiResponseContainer = document.getElementById('ai-response');
    
    let html = mdText
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/## (.*)/g, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\* (.*)/gm, '<li>$1</li>')
        .replace(/^\- (.*)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/<\/li>\n<li>/g, '</li><li>');
        
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    
    aiResponseContainer.innerHTML = `<div class="ai-report">${html}</div>`;
    
    // Auto insert matching vector icons to headers
    document.querySelectorAll('.ai-report h4').forEach(h4 => {
        const text = h4.textContent.toLowerCase();
        let icon = 'sparkles';
        if (text.includes('scale') || text.includes('increase') || text.includes('positive') || text.includes('escalar')) icon = 'trending-up';
        else if (text.includes('pause') || text.includes('optimize') || text.includes('critical') || text.includes('loss') || text.includes('pausar')) icon = 'alert-triangle';
        else if (text.includes('guidelines') || text.includes('budget') || text.includes('allocation') || text.includes('orçamento')) icon = 'sliders';
        
        h4.innerHTML = `<i data-lucide="${icon}"></i> ` + h4.innerHTML;
    });
    
    lucide.createIcons();
}

// API KEY STORAGE LOGIC
function saveApiKey() {
    const input = document.getElementById('input-api-key').value.trim();
    if (input) {
        localStorage.setItem('gemini_api_key', input);
        alert('Gemini API Key saved locally!');
    } else {
        localStorage.removeItem('gemini_api_key');
        alert('API Key removed. The AI will run in local simulation mode.');
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
        btn.querySelector('span').textContent = 'API Key Saved';
        input.value = key;
    } else {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-secondary');
        btn.querySelector('span').textContent = 'Gemini API Key';
        input.value = '';
    }
}

// LOAD MOCK DEMO DATA (FOR EASY EVALUATION)
function loadMockData() {
    // 1. Mock Traffic Costs Data
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

    // 2. Mock Affiliate Revenues Data
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

    // Update Uploader visual cards
    updateFileCard('cost', 'mock_traffic_costs.csv');
    updateFileCard('revenue', 'mock_affiliate_revenue.csv');

    // Run auto-mapping
    state.mapping.cost = { campaign: 'Campaign', spend: 'Spend', date: 'Date', clicks: 'Clicks' };
    state.mapping.revenue = { campaign: 'utm_campaign', value: 'Payout', date: 'Date', sales: 'Sales' };

    document.getElementById('mapping-section').classList.add('hidden');
    processArbitrageData();
}
