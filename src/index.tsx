import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Types for investment data
interface AssetData {
  symbol: string
  price: number
  change: number
  volume: number
  marketCap?: number
}

interface PortfolioData {
  totalValue: number
  dailyReturn: number
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  assets: AssetData[]
}

interface BacktestResult {
  startDate: string
  endDate: string
  initialValue: number
  finalValue: number
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  trades: number
  winRate: number
}

// Mock data generators (실제로는 외부 API나 AI 모델에서 가져옴)
function generateMockAssetData(): AssetData[] {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']
  return symbols.map(symbol => ({
    symbol,
    price: Math.random() * 1000 + 50,
    change: (Math.random() - 0.5) * 10,
    volume: Math.floor(Math.random() * 1000000),
    marketCap: Math.random() * 1000000000000
  }))
}

function generateMockPortfolioData(): PortfolioData {
  const assets = generateMockAssetData().slice(0, 3)
  return {
    totalValue: 1000000 + Math.random() * 500000,
    dailyReturn: (Math.random() - 0.5) * 5,
    totalReturn: (Math.random() - 0.3) * 50,
    sharpeRatio: Math.random() * 2,
    maxDrawdown: Math.random() * -20,
    assets
  }
}

function generateMockBacktestResult(): BacktestResult {
  return {
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    initialValue: 1000000,
    finalValue: 1000000 + (Math.random() - 0.3) * 500000,
    totalReturn: (Math.random() - 0.3) * 50,
    sharpeRatio: Math.random() * 2,
    maxDrawdown: Math.random() * -25,
    trades: Math.floor(Math.random() * 1000) + 100,
    winRate: Math.random() * 0.4 + 0.4 // 40-80%
  }
}

// API Routes
app.get('/api/portfolio', (c) => {
  const portfolio = generateMockPortfolioData()
  return c.json(portfolio)
})

app.get('/api/assets', (c) => {
  const assets = generateMockAssetData()
  return c.json(assets)
})

app.get('/api/backtest', (c) => {
  const result = generateMockBacktestResult()
  return c.json(result)
})

app.post('/api/backtest/run', async (c) => {
  const { strategy, startDate, endDate, initialCapital } = await c.req.json()
  
  // 여기서 실제 백테스트 로직 실행
  // 현재는 Mock 데이터 반환
  const result: BacktestResult = {
    startDate: startDate || '2023-01-01',
    endDate: endDate || '2024-12-31',
    initialValue: initialCapital || 1000000,
    finalValue: (initialCapital || 1000000) * (1 + (Math.random() - 0.3) * 0.5),
    totalReturn: (Math.random() - 0.3) * 50,
    sharpeRatio: Math.random() * 2,
    maxDrawdown: Math.random() * -25,
    trades: Math.floor(Math.random() * 500) + 50,
    winRate: Math.random() * 0.4 + 0.4
  }
  
  return c.json({ success: true, result })
})

app.get('/api/optimization/tax', (c) => {
  // 박사님의 세무 최적화 로직
  const taxOptimization = {
    currentTaxBurden: Math.random() * 0.3, // 30% 최대
    optimizedTaxBurden: Math.random() * 0.15, // 15% 최대 (최적화 후)
    potentialSavings: Math.random() * 100000, // 최대 10만 절약
    strategies: [
      '장기 보유를 통한 장기양도소득세 혜택',
      '손실 실현을 통한 세금 손실 상쇄',
      '연금저축을 통한 소득공제 활용',
      '변액보험을 통한 상속세 절감'
    ]
  }
  return c.json(taxOptimization)
})

app.get('/api/insurance/portfolio', (c) => {
  // 박사님의 보험 포트폴리오 최적화
  const insurancePortfolio = {
    totalCoverage: Math.random() * 5000000000, // 50억 최대 보장
    monthlyPremium: Math.random() * 500000, // 월 50만원 최대
    policies: [
      { type: '종신보험', coverage: Math.random() * 1000000000, premium: Math.random() * 100000 },
      { type: '변액보험', coverage: Math.random() * 2000000000, premium: Math.random() * 200000 },
      { type: '연금보험', coverage: Math.random() * 1000000000, premium: Math.random() * 150000 }
    ],
    optimization: {
      riskCoverage: Math.random() * 100,
      returnPotential: Math.random() * 100,
      taxEfficiency: Math.random() * 100
    }
  }
  return c.json(insurancePortfolio)
})

// Main dashboard route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 통합 자산관리 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <i class="fas fa-chart-line text-2xl text-blue-600 mr-3"></i>
                        <h1 class="text-xl font-bold text-gray-900">AI 통합 자산관리 시스템</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">한국인프라연구원(주)</span>
                        <span class="text-sm text-gray-600">📞 010-9143-0800</span>
                        <span class="text-sm text-gray-600">📧 infrastructure@kakao.com</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- 메인 대시보드 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- 상단 KPI 카드들 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="flex items-center">
                        <div class="p-2 bg-blue-100 rounded-lg">
                            <i class="fas fa-wallet text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">총 자산</p>
                            <p class="text-2xl font-semibold text-gray-900" id="totalAssets">로딩중...</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="flex items-center">
                        <div class="p-2 bg-green-100 rounded-lg">
                            <i class="fas fa-chart-line text-green-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">일일 수익률</p>
                            <p class="text-2xl font-semibold" id="dailyReturn">로딩중...</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="flex items-center">
                        <div class="p-2 bg-purple-100 rounded-lg">
                            <i class="fas fa-trophy text-purple-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">샤프 비율</p>
                            <p class="text-2xl font-semibold text-gray-900" id="sharpeRatio">로딩중...</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="flex items-center">
                        <div class="p-2 bg-red-100 rounded-lg">
                            <i class="fas fa-chart-area text-red-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">최대 낙폭</p>
                            <p class="text-2xl font-semibold text-gray-900" id="maxDrawdown">로딩중...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 탭 메뉴 -->
            <div class="bg-white rounded-lg shadow-sm border mb-8">
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8 px-6">
                        <button class="tab-btn border-b-2 border-blue-500 py-4 px-1 text-blue-600 font-medium" data-tab="portfolio">
                            <i class="fas fa-chart-pie mr-2"></i>포트폴리오
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700" data-tab="backtest">
                            <i class="fas fa-history mr-2"></i>백테스트
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700" data-tab="tax">
                            <i class="fas fa-calculator mr-2"></i>세무 최적화
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700" data-tab="insurance">
                            <i class="fas fa-shield-alt mr-2"></i>보험 포트폴리오
                        </button>
                    </nav>
                </div>

                <!-- 포트폴리오 탭 -->
                <div id="portfolio-tab" class="tab-content p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">자산 배분</h3>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <canvas id="portfolioChart" width="300" height="300"></canvas>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">보유 자산</h3>
                            <div id="assetsList" class="space-y-3">
                                <!-- 자산 목록이 여기에 동적으로 추가됩니다 -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 백테스트 탭 -->
                <div id="backtest-tab" class="tab-content p-6 hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">백테스트 설정</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">전략 선택</label>
                                    <select id="strategySelect" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="momentum">모멘텀 전략</option>
                                        <option value="mean_reversion">평균 회귀 전략</option>
                                        <option value="rl_agent">강화학습 에이전트</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">초기 자본</label>
                                    <input type="number" id="initialCapital" value="1000000" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                </div>
                                <button onclick="runBacktest()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                                    <i class="fas fa-play mr-2"></i>백테스트 실행
                                </button>
                            </div>
                        </div>
                        <div class="lg:col-span-2">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">백테스트 결과</h3>
                            <div id="backtestResults" class="bg-gray-50 p-6 rounded-lg">
                                <p class="text-gray-500 text-center">백테스트를 실행해주세요</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 세무 최적화 탭 -->
                <div id="tax-tab" class="tab-content p-6 hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">세무 최적화 현황</h3>
                            <div id="taxOptimization" class="bg-gray-50 p-6 rounded-lg">
                                <p class="text-gray-500 text-center">로딩중...</p>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">절세 전략</h3>
                            <div id="taxStrategies" class="space-y-3">
                                <!-- 절세 전략이 여기에 동적으로 추가됩니다 -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 보험 포트폴리오 탭 -->
                <div id="insurance-tab" class="tab-content p-6 hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">보험 포트폴리오 현황</h3>
                            <div id="insurancePortfolio" class="bg-gray-50 p-6 rounded-lg">
                                <p class="text-gray-500 text-center">로딩중...</p>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">최적화 지표</h3>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <canvas id="insuranceChart" width="300" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
