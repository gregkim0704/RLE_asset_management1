// AI 통합 자산관리 시스템 - 프론트엔드 JavaScript
console.log('🚀 AI 통합 자산관리 시스템 로딩 중...');

// 글로벌 변수
let portfolioChart = null;
let insuranceChart = null;
let currentPortfolioData = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 대시보드 초기화 시작');
    
    // 탭 이벤트 리스너 설정
    setupTabSwitching();
    
    // 초기 데이터 로드
    loadDashboardData();
    
    console.log('✅ 대시보드 초기화 완료');
});

// 탭 전환 기능
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 모든 탭 버튼과 컨텐츠 비활성화
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // 선택된 탭 활성화
            this.classList.remove('border-transparent', 'text-gray-500');
            this.classList.add('border-blue-500', 'text-blue-600');
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                
                // 탭별 특별 처리
                if (targetTab === 'portfolio') {
                    loadPortfolioData();
                } else if (targetTab === 'tax') {
                    loadTaxOptimization();
                } else if (targetTab === 'insurance') {
                    loadInsuranceData();
                }
            }
        });
    });
}

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        console.log('📈 포트폴리오 데이터 로딩 중...');
        
        const response = await axios.get('/api/portfolio');
        const data = response.data;
        currentPortfolioData = data;
        
        // KPI 카드 업데이트
        updateKPICards(data);
        
        // 포트폴리오 차트 및 자산 목록 업데이트
        updatePortfolioDisplay(data);
        
        console.log('✅ 대시보드 데이터 로딩 완료');
    } catch (error) {
        console.error('❌ 데이터 로딩 실패:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    }
}

// KPI 카드 업데이트
function updateKPICards(data) {
    document.getElementById('totalAssets').textContent = 
        new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.totalValue);
    
    const dailyReturnElement = document.getElementById('dailyReturn');
    dailyReturnElement.textContent = `${data.dailyReturn.toFixed(2)}%`;
    dailyReturnElement.className = `text-2xl font-semibold ${data.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`;
    
    document.getElementById('sharpeRatio').textContent = data.sharpeRatio.toFixed(2);
    
    const maxDrawdownElement = document.getElementById('maxDrawdown');
    maxDrawdownElement.textContent = `${data.maxDrawdown.toFixed(2)}%`;
    maxDrawdownElement.className = 'text-2xl font-semibold text-red-600';
}

// 포트폴리오 데이터 로드
async function loadPortfolioData() {
    if (currentPortfolioData) {
        updatePortfolioDisplay(currentPortfolioData);
    } else {
        await loadDashboardData();
    }
}

// 포트폴리오 디스플레이 업데이트
function updatePortfolioDisplay(data) {
    // 포트폴리오 차트 생성/업데이트
    createPortfolioChart(data.assets);
    
    // 자산 목록 업데이트
    updateAssetsList(data.assets);
}

// 포트폴리오 차트 생성
function createPortfolioChart(assets) {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    // 기존 차트가 있으면 제거
    if (portfolioChart) {
        portfolioChart.destroy();
    }
    
    const labels = assets.map(asset => asset.symbol);
    const values = assets.map(asset => asset.price * Math.random() * 1000); // 임시 비중 계산
    const backgroundColors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
    ];
    
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
                }
            }
        }
    });
}

// 자산 목록 업데이트
function updateAssetsList(assets) {
    const container = document.getElementById('assetsList');
    if (!container) return;
    
    container.innerHTML = assets.map(asset => `
        <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div class="flex items-center">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span class="text-xs font-semibold text-blue-600">${asset.symbol.charAt(0)}</span>
                </div>
                <div>
                    <p class="font-medium text-gray-900">${asset.symbol}</p>
                    <p class="text-sm text-gray-500">${new Intl.NumberFormat('ko-KR').format(asset.volume)} 주</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-medium text-gray-900">$${asset.price.toFixed(2)}</p>
                <p class="text-sm ${asset.change >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%
                </p>
            </div>
        </div>
    `).join('');
}

// 백테스트 실행
async function runBacktest() {
    const strategy = document.getElementById('strategySelect').value;
    const initialCapital = parseInt(document.getElementById('initialCapital').value);
    
    const resultsContainer = document.getElementById('backtestResults');
    resultsContainer.innerHTML = '<p class="text-center text-gray-500">백테스트 실행 중...</p>';
    
    try {
        console.log('🔄 백테스트 실행 중...');
        
        const response = await axios.post('/api/backtest/run', {
            strategy,
            startDate: '2023-01-01',
            endDate: '2024-12-31',
            initialCapital
        });
        
        const result = response.data.result;
        
        // 백테스트 결과 표시
        displayBacktestResults(result);
        
        console.log('✅ 백테스트 완료');
    } catch (error) {
        console.error('❌ 백테스트 실패:', error);
        resultsContainer.innerHTML = '<p class="text-center text-red-500">백테스트 실행에 실패했습니다.</p>';
    }
}

// 백테스트 결과 표시
function displayBacktestResults(result) {
    const container = document.getElementById('backtestResults');
    
    const totalReturnClass = result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600';
    const finalValueFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.finalValue);
    
    container.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="text-center">
                <p class="text-sm text-gray-600">최종 자산</p>
                <p class="text-lg font-semibold">${finalValueFormatted}</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600">총 수익률</p>
                <p class="text-lg font-semibold ${totalReturnClass}">${result.totalReturn.toFixed(2)}%</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600">샤프 비율</p>
                <p class="text-lg font-semibold">${result.sharpeRatio.toFixed(2)}</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600">승률</p>
                <p class="text-lg font-semibold">${(result.winRate * 100).toFixed(1)}%</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded border">
                <p class="text-sm font-medium text-gray-600 mb-1">기간</p>
                <p class="text-sm">${result.startDate} ~ ${result.endDate}</p>
            </div>
            <div class="bg-white p-4 rounded border">
                <p class="text-sm font-medium text-gray-600 mb-1">총 거래 수</p>
                <p class="text-sm">${result.trades.toLocaleString()}회</p>
            </div>
            <div class="bg-white p-4 rounded border">
                <p class="text-sm font-medium text-gray-600 mb-1">최대 낙폭</p>
                <p class="text-sm text-red-600">${result.maxDrawdown.toFixed(2)}%</p>
            </div>
        </div>
    `;
}

// 세무 최적화 데이터 로드
async function loadTaxOptimization() {
    try {
        console.log('💰 세무 최적화 데이터 로딩 중...');
        
        const response = await axios.get('/api/optimization/tax');
        const data = response.data;
        
        displayTaxOptimization(data);
        
        console.log('✅ 세무 최적화 데이터 로딩 완료');
    } catch (error) {
        console.error('❌ 세무 데이터 로딩 실패:', error);
        showError('세무 데이터를 불러오는데 실패했습니다.');
    }
}

// 세무 최적화 표시
function displayTaxOptimization(data) {
    const container = document.getElementById('taxOptimization');
    const strategiesContainer = document.getElementById('taxStrategies');
    
    const savingsFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.potentialSavings);
    
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">현재 세부담</p>
                <p class="text-2xl font-semibold text-red-600">${(data.currentTaxBurden * 100).toFixed(1)}%</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">최적화 후 세부담</p>
                <p class="text-2xl font-semibold text-green-600">${(data.optimizedTaxBurden * 100).toFixed(1)}%</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">예상 절세액</p>
                <p class="text-2xl font-semibold text-blue-600">${savingsFormatted}</p>
            </div>
        </div>
        <div class="mt-4 p-4 bg-green-50 rounded-lg">
            <p class="text-sm text-green-800">
                <i class="fas fa-lightbulb mr-2"></i>
                최적화를 통해 연간 <strong>${savingsFormatted}</strong>의 절세 효과를 기대할 수 있습니다.
            </p>
        </div>
    `;
    
    strategiesContainer.innerHTML = data.strategies.map((strategy, index) => `
        <div class="flex items-start p-4 bg-white rounded-lg border">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span class="text-sm font-semibold text-blue-600">${index + 1}</span>
            </div>
            <div>
                <p class="text-sm text-gray-900">${strategy}</p>
            </div>
        </div>
    `).join('');
}

// 보험 포트폴리오 데이터 로드
async function loadInsuranceData() {
    try {
        console.log('🛡️ 보험 포트폴리오 데이터 로딩 중...');
        
        const response = await axios.get('/api/insurance/portfolio');
        const data = response.data;
        
        displayInsurancePortfolio(data);
        createInsuranceChart(data.optimization);
        
        console.log('✅ 보험 포트폴리오 데이터 로딩 완료');
    } catch (error) {
        console.error('❌ 보험 데이터 로딩 실패:', error);
        showError('보험 데이터를 불러오는데 실패했습니다.');
    }
}

// 보험 포트폴리오 표시
function displayInsurancePortfolio(data) {
    const container = document.getElementById('insurancePortfolio');
    
    const totalCoverageFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.totalCoverage);
    const monthlyPremiumFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.monthlyPremium);
    
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">총 보장금액</p>
                <p class="text-lg font-semibold text-blue-600">${totalCoverageFormatted}</p>
            </div>
            <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">월 납입보험료</p>
                <p class="text-lg font-semibold text-gray-900">${monthlyPremiumFormatted}</p>
            </div>
        </div>
        
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 mb-3">보험 상품별 현황</h4>
            ${data.policies.map(policy => {
                const coverageFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(policy.coverage);
                const premiumFormatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(policy.premium);
                
                return `
                    <div class="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                            <p class="font-medium text-gray-900">${policy.type}</p>
                            <p class="text-sm text-gray-500">보장: ${coverageFormatted}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-medium text-gray-900">${premiumFormatted}</p>
                            <p class="text-sm text-gray-500">월납</p>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 보험 최적화 차트 생성
function createInsuranceChart(optimization) {
    const ctx = document.getElementById('insuranceChart');
    if (!ctx) return;
    
    // 기존 차트가 있으면 제거
    if (insuranceChart) {
        insuranceChart.destroy();
    }
    
    insuranceChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['위험 보장', '수익성', '세제 효율성'],
            datasets: [{
                label: '현재 포트폴리오',
                data: [
                    optimization.riskCoverage,
                    optimization.returnPotential,
                    optimization.taxEfficiency
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(59, 130, 246)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 에러 표시 함수
function showError(message) {
    // 간단한 에러 토스트 (실제로는 더 정교한 UI 라이브러리 사용 권장)
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle mr-2"></i>
        ${message}
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 5000);
}

// 유틸리티 함수들
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', { 
        style: 'currency', 
        currency: 'KRW',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(value, decimals = 2) {
    return `${value.toFixed(decimals)}%`;
}

// 전역 함수로 노출 (HTML에서 호출용)
window.runBacktest = runBacktest;

console.log('🎯 AI 통합 자산관리 시스템 준비 완료!');