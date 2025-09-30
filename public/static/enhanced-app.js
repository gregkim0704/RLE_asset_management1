// Enhanced AI 통합 자산관리 시스템 - Real Data Integration
console.log('🚀 Enhanced AI 통합 자산관리 시스템 로딩 중...');

// 글로벌 변수
let portfolioChart = null;
let insuranceChart = null;
let performanceChart = null;
let riskChart = null;
let currentPortfolioData = null;
let marketAnalysisData = null;
let isEnhancedMode = true; // 실시간 데이터 모드

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Enhanced 대시보드 초기화 시작');
    
    // 탭 이벤트 리스너 설정
    setupTabSwitching();
    
    // Enhanced 모드 토글 추가
    addEnhancedModeToggle();
    
    // 초기 데이터 로드
    loadEnhancedDashboardData();
    
    // 정기 업데이트 스케줄링 (30초마다)
    setInterval(loadEnhancedDashboardData, 30000);
    
    console.log('✅ Enhanced 대시보드 초기화 완료');
});

// Enhanced 모드 토글 UI 추가
function addEnhancedModeToggle() {
    const header = document.querySelector('header .flex.justify-between');
    if (header) {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'flex items-center space-x-2';
        toggleContainer.innerHTML = `
            <span class="text-sm text-gray-600">실시간 데이터</span>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="enhancedToggle" class="sr-only peer" ${isEnhancedMode ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        `;
        
        header.insertBefore(toggleContainer, header.lastElementChild);
        
        // 토글 이벤트
        document.getElementById('enhancedToggle').addEventListener('change', function(e) {
            isEnhancedMode = e.target.checked;
            console.log(`🔄 ${isEnhancedMode ? 'Enhanced' : 'Legacy'} 모드로 전환`);
            loadDashboardData();
        });
    }
}

// Enhanced 대시보드 데이터 로드
async function loadEnhancedDashboardData() {
    if (!isEnhancedMode) {
        return loadDashboardData(); // Legacy 모드로 폴백
    }
    
    try {
        console.log('📈 Enhanced 포트폴리오 데이터 로딩 중...');
        
        // 병렬로 여러 데이터 소스 호출
        const [portfolioResponse, marketAnalysisResponse, riskMetricsResponse] = await Promise.all([
            axios.get('/api/portfolio/enhanced'),
            axios.get('/api/market/analysis'),
            axios.get('/api/risk/metrics?symbols=AAPL,GOOGL,MSFT')
        ]);
        
        currentPortfolioData = portfolioResponse.data;
        marketAnalysisData = marketAnalysisResponse.data;
        const riskMetrics = riskMetricsResponse.data;
        
        // UI 업데이트
        updateEnhancedKPICards(currentPortfolioData);
        updateEnhancedPortfolioDisplay(currentPortfolioData);
        updateMarketAnalysisDisplay(marketAnalysisData);
        updateRiskMetricsDisplay(riskMetrics);
        
        console.log('✅ Enhanced 대시보드 데이터 로딩 완료');
    } catch (error) {
        console.error('❌ Enhanced 데이터 로딩 실패, Legacy 모드로 폴백:', error);
        showNotification('실시간 데이터 연결에 실패했습니다. Mock 데이터를 표시합니다.', 'warning');
        isEnhancedMode = false;
        document.getElementById('enhancedToggle').checked = false;
        loadDashboardData();
    }
}

// Enhanced KPI 카드 업데이트
function updateEnhancedKPICards(data) {
    document.getElementById('totalAssets').textContent = 
        new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.totalValue);
    
    const dailyReturnElement = document.getElementById('dailyReturn');
    dailyReturnElement.textContent = `${data.dailyReturn.toFixed(2)}%`;
    dailyReturnElement.className = `text-2xl font-semibold ${data.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`;
    
    document.getElementById('sharpeRatio').textContent = data.sharpeRatio.toFixed(2);
    
    const maxDrawdownElement = document.getElementById('maxDrawdown');
    maxDrawdownElement.textContent = `${data.maxDrawdown.toFixed(2)}%`;
    maxDrawdownElement.className = 'text-2xl font-semibold text-red-600';
    
    // AI 예측 정보 추가
    if (data.aiPredictions && data.aiPredictions.length > 0) {
        addAIPredictionIndicator(data.aiPredictions);
    }
}

// AI 예측 표시기 추가
function addAIPredictionIndicator(predictions) {
    const kpiContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    if (kpiContainer && !document.getElementById('ai-prediction-card')) {
        const aiCard = document.createElement('div');
        aiCard.id = 'ai-prediction-card';
        aiCard.className = 'bg-white p-6 rounded-lg shadow-sm border';
        
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
        const strongSignals = predictions.filter(p => p.confidence > 0.7).length;
        
        aiCard.innerHTML = `
            <div class="flex items-center">
                <div class="p-2 bg-purple-100 rounded-lg">
                    <i class="fas fa-robot text-purple-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">AI 신뢰도</p>
                    <p class="text-2xl font-semibold text-purple-600">${(avgConfidence * 100).toFixed(1)}%</p>
                    <p class="text-xs text-gray-500">${strongSignals}개 강한 신호</p>
                </div>
            </div>
        `;
        
        kpiContainer.appendChild(aiCard);
    }
}

// Enhanced 포트폴리오 디스플레이 업데이트
function updateEnhancedPortfolioDisplay(data) {
    // AI 예측 정보를 포함한 포트폴리오 차트
    createEnhancedPortfolioChart(data.portfolio, data.aiPredictions);
    
    // 실시간 데이터를 포함한 자산 목록
    updateEnhancedAssetsList(data.portfolio, data.aiPredictions);
}

// Enhanced 포트폴리오 차트 생성
function createEnhancedPortfolioChart(portfolio, predictions) {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    // 기존 차트가 있으면 제거
    if (portfolioChart) {
        portfolioChart.destroy();
    }
    
    const labels = portfolio.map(asset => asset.symbol);
    const values = portfolio.map(asset => asset.weight * 100);
    const predictions_map = {};
    
    // 예측 데이터 매핑
    if (predictions) {
        predictions.forEach(pred => {
            predictions_map[pred.symbol] = pred;
        });
    }
    
    // 예측 신뢰도에 따른 색상 설정
    const backgroundColors = portfolio.map(asset => {
        const pred = predictions_map[asset.symbol];
        if (!pred) return '#6B7280'; // 회색
        
        if (pred.confidence > 0.7) {
            return pred.prediction > 0 ? '#10B981' : '#EF4444'; // 높은 신뢰도: 녹색/빨강
        } else if (pred.confidence > 0.4) {
            return pred.prediction > 0 ? '#F59E0B' : '#F97316'; // 중간 신뢰도: 주황
        } else {
            return '#6B7280'; // 낮은 신뢰도: 회색
        }
    });
    
    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const symbol = labels[context.dataIndex];
                            const pred = predictions_map[symbol];
                            const weight = values[context.dataIndex];
                            
                            let tooltip = `${symbol}: ${weight.toFixed(1)}%`;
                            
                            if (pred) {
                                tooltip += `\\nAI 예측: ${pred.prediction > 0 ? '+' : ''}${pred.prediction.toFixed(1)}%`;
                                tooltip += `\\n신뢰도: ${(pred.confidence * 100).toFixed(1)}%`;
                                tooltip += `\\n액션: ${pred.action.toUpperCase()}`;
                            }
                            
                            return tooltip.split('\\n');
                        }
                    }
                }
            }
        }
    });
}

// Enhanced 자산 목록 업데이트
function updateEnhancedAssetsList(portfolio, predictions) {
    const container = document.getElementById('assetsList');
    if (!container) return;
    
    const predictions_map = {};
    if (predictions) {
        predictions.forEach(pred => {
            predictions_map[pred.symbol] = pred;
        });
    }
    
    container.innerHTML = portfolio.map(asset => {
        const pred = predictions_map[asset.symbol];
        const predictionBadge = pred ? `
            <div class="flex items-center space-x-1 mt-1">
                <span class="text-xs px-1.5 py-0.5 rounded ${
                    pred.action === 'buy' ? 'bg-green-100 text-green-800' :
                    pred.action === 'sell' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }">${pred.action.toUpperCase()}</span>
                <span class="text-xs text-gray-500">${(pred.confidence * 100).toFixed(0)}%</span>
            </div>
        ` : '';
        
        return `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-xs font-semibold text-blue-600">${asset.symbol.charAt(0)}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${asset.symbol}</p>
                        <p class="text-sm text-gray-500">${asset.quantity.toLocaleString('ko-KR')} 주</p>
                        ${predictionBadge}
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-medium text-gray-900">$${asset.price.toFixed(2)}</p>
                    <p class="text-sm ${asset.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${asset.changePercent >= 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%
                    </p>
                    <p class="text-xs text-gray-500">
                        PnL: ${asset.unrealizedPnL >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR', { 
                            style: 'currency', 
                            currency: 'KRW',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0 
                        }).format(asset.unrealizedPnL)}
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

// 시장 분석 디스플레이 업데이트
function updateMarketAnalysisDisplay(analysis) {
    // 상단에 시장 센티멘트 표시
    const marketSentimentIndicator = document.getElementById('market-sentiment');
    if (!marketSentimentIndicator) {
        addMarketSentimentIndicator(analysis.marketSentiment);
    }
    
    // 섹터 분석 차트
    if (analysis.sectorAnalysis && analysis.sectorAnalysis.length > 0) {
        createSectorAnalysisChart(analysis.sectorAnalysis);
    }
    
    // AI 추천 종목
    if (analysis.topPicks && analysis.topPicks.length > 0) {
        updateTopPicksDisplay(analysis.topPicks);
    }
    
    // 리스크 알림
    if (analysis.riskAlert && analysis.riskAlert.length > 0) {
        updateRiskAlertsDisplay(analysis.riskAlert);
    }
}

// 시장 센티멘트 인디케이터 추가
function addMarketSentimentIndicator(sentiment) {
    const header = document.querySelector('header');
    if (header && !document.getElementById('market-sentiment')) {
        const sentimentBadge = document.createElement('div');
        sentimentBadge.id = 'market-sentiment';
        sentimentBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            sentiment === 'bullish' ? 'bg-green-100 text-green-800' :
            sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
        }`;
        
        const icon = sentiment === 'bullish' ? '📈' : 
                     sentiment === 'bearish' ? '📉' : '➖';
        
        sentimentBadge.innerHTML = `
            ${icon} 시장 심리: ${
                sentiment === 'bullish' ? '강세' :
                sentiment === 'bearish' ? '약세' : '중립'
            }
        `;
        
        header.querySelector('.max-w-7xl .flex').appendChild(sentimentBadge);
    }
}

// 리스크 메트릭 디스플레이 업데이트
function updateRiskMetricsDisplay(riskMetrics) {
    // VaR 정보를 포트폴리오 탭에 추가
    const portfolioTab = document.getElementById('portfolio-tab');
    if (portfolioTab && !document.getElementById('risk-metrics-section')) {
        const riskSection = document.createElement('div');
        riskSection.id = 'risk-metrics-section';
        riskSection.className = 'mt-6';
        riskSection.innerHTML = `
            <h3 class="text-lg font-medium text-gray-900 mb-4">리스크 메트릭</h3>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600">VaR (95%)</p>
                    <p class="text-xl font-semibold text-red-600">${riskMetrics.var95.toFixed(2)}%</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600">VaR (99%)</p>
                    <p class="text-xl font-semibold text-red-700">${riskMetrics.var99.toFixed(2)}%</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600">Expected Shortfall</p>
                    <p class="text-xl font-semibold text-red-800">${riskMetrics.expectedShortfall.toFixed(2)}%</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600">포트폴리오 베타</p>
                    <p class="text-xl font-semibold text-blue-600">${riskMetrics.beta.toFixed(2)}</p>
                </div>
            </div>
        `;
        
        portfolioTab.appendChild(riskSection);
    }
}

// Enhanced 백테스트 실행
async function runEnhancedBacktest() {
    const strategy = document.getElementById('strategySelect').value;
    const initialCapital = parseInt(document.getElementById('initialCapital').value);
    
    const resultsContainer = document.getElementById('backtestResults');
    resultsContainer.innerHTML = `
        <div class="flex items-center justify-center p-6">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <p class="text-gray-500">Enhanced 백테스트 실행 중... (실시간 데이터 분석)</p>
        </div>
    `;
    
    try {
        console.log('🔄 Enhanced 백테스트 실행 중...');
        
        const response = await axios.post('/api/backtest/enhanced', {
            strategy,
            symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
            startDate: '2023-01-01',
            endDate: '2024-12-31',
            initialCapital
        });
        
        // Enhanced 백테스트 결과 표시
        displayEnhancedBacktestResults(response.data);
        
        console.log('✅ Enhanced 백테스트 완료');
    } catch (error) {
        console.error('❌ Enhanced 백테스트 실패, 기본 백테스트로 폴백:', error);
        await runBacktest(); // 기본 백테스트로 폴백
    }
}

// Enhanced 백테스트 결과 표시
function displayEnhancedBacktestResults(data) {
    const container = document.getElementById('backtestResults');
    const result = data.result;
    const metrics = data.metrics;
    
    const totalReturnClass = result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600';
    const finalValueFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.finalValue);
    
    container.innerHTML = `
        <div class="space-y-6">
            <!-- 주요 성과 지표 -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="text-center bg-white p-4 rounded-lg border">
                    <p class="text-sm text-gray-600">최종 자산</p>
                    <p class="text-lg font-semibold">${finalValueFormatted}</p>
                </div>
                <div class="text-center bg-white p-4 rounded-lg border">
                    <p class="text-sm text-gray-600">총 수익률</p>
                    <p class="text-lg font-semibold ${totalReturnClass}">${result.totalReturn.toFixed(2)}%</p>
                </div>
                <div class="text-center bg-white p-4 rounded-lg border">
                    <p class="text-sm text-gray-600">샤프 비율</p>
                    <p class="text-lg font-semibold">${result.sharpeRatio.toFixed(2)}</p>
                </div>
                <div class="text-center bg-white p-4 rounded-lg border">
                    <p class="text-sm text-gray-600">승률</p>
                    <p class="text-lg font-semibold">${(result.winRate * 100).toFixed(1)}%</p>
                </div>
            </div>
            
            <!-- Enhanced 메트릭 -->
            ${metrics ? `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-medium text-blue-900 mb-3">고급 성과 분석</h4>
                    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="text-center">
                            <p class="text-sm text-blue-700">변동성</p>
                            <p class="font-semibold text-blue-900">${metrics.volatility.toFixed(2)}%</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-blue-700">칼마 비율</p>
                            <p class="font-semibold text-blue-900">${metrics.calmarRatio.toFixed(2)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-blue-700">최대 낙폭</p>
                            <p class="font-semibold text-blue-900">${metrics.maxDrawdown.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- 기본 정보 -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="bg-white p-4 rounded border">
                    <p class="text-sm font-medium text-gray-600 mb-1">백테스트 기간</p>
                    <p class="text-sm">${result.startDate} ~ ${result.endDate}</p>
                </div>
                <div class="bg-white p-4 rounded border">
                    <p class="text-sm font-medium text-gray-600 mb-1">총 거래 수</p>
                    <p class="text-sm">${result.trades.toLocaleString()}회</p>
                </div>
                <div class="bg-white p-4 rounded border">
                    <p class="text-sm font-medium text-gray-600 mb-1">데이터 소스</p>
                    <p class="text-sm text-blue-600">실시간 API 연동</p>
                </div>
            </div>
            
            <!-- 성과 차트 영역 -->
            <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-medium text-gray-900 mb-3">포트폴리오 가치 변화</h4>
                <canvas id="performanceChart" height="100"></canvas>
            </div>
        </div>
    `;
    
    // 성과 차트 생성
    if (data.performance && data.performance.length > 0) {
        createPerformanceChart(data.performance, result.initialValue);
    }
}

// 성과 차트 생성
function createPerformanceChart(performance, initialValue) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    // 기존 차트가 있으면 제거
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const labels = performance.map((_, i) => `Day ${i + 1}`);
    const values = performance.map(val => ((val - initialValue) / initialValue * 100));
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '포트폴리오 수익률 (%)',
                data: values,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
        type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
        type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
        'bg-blue-100 border border-blue-400 text-blue-700'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${
                type === 'error' ? 'exclamation-triangle' :
                type === 'warning' ? 'exclamation-circle' :
                type === 'success' ? 'check-circle' : 'info-circle'
            } mr-2"></i>
            <span>${message}</span>
            <button class="ml-4 text-xl font-semibold" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// 기존 함수들 오버라이드
const originalLoadDashboardData = loadDashboardData;
const originalRunBacktest = runBacktest;

// Legacy 함수들과의 호환성
if (typeof loadDashboardData === 'undefined') {
    window.loadDashboardData = loadEnhancedDashboardData;
}

if (typeof runBacktest === 'undefined') {
    window.runBacktest = runEnhancedBacktest;
} else {
    // Enhanced 버전으로 업그레이드
    window.runBacktest = async function() {
        if (isEnhancedMode) {
            return runEnhancedBacktest();
        } else {
            return originalRunBacktest();
        }
    };
}

// 전역 함수로 노출
window.runEnhancedBacktest = runEnhancedBacktest;
window.loadEnhancedDashboardData = loadEnhancedDashboardData;

console.log('🎯 Enhanced AI 통합 자산관리 시스템 준비 완료!');