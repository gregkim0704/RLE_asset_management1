import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { SimpleEnhancedAPI } from './services/simple-enhanced-api'

const app = new Hono()
const enhancedAPI = new SimpleEnhancedAPI()

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

// Enhanced API Routes with Real Data Integration

// Enhanced Portfolio with Real-time Data and AI Predictions
app.get('/api/portfolio/enhanced', async (c) => {
  try {
    const portfolioData = await enhancedAPI.getEnhancedPortfolio();
    return c.json(portfolioData);
  } catch (error) {
    console.error('Enhanced portfolio API error:', error);
    return c.json({ error: 'Failed to fetch enhanced portfolio data' }, 500);
  }
})

// Real-time Market Analysis
app.get('/api/market/analysis', async (c) => {
  try {
    const analysis = await enhancedAPI.getMarketAnalysis();
    return c.json(analysis);
  } catch (error) {
    console.error('Market analysis API error:', error);
    return c.json({ error: 'Failed to fetch market analysis' }, 500);
  }
})

// Risk Metrics and Analysis
app.get('/api/risk/metrics', async (c) => {
  try {
    const symbols = c.req.query('symbols')?.split(',') || ['AAPL', 'GOOGL', 'MSFT'];
    const riskMetrics = await enhancedAPI.getRiskMetrics(symbols);
    return c.json(riskMetrics);
  } catch (error) {
    console.error('Risk metrics API error:', error);
    return c.json({ error: 'Failed to calculate risk metrics' }, 500);
  }
})

// API Routes - Legacy (fallback to enhanced if available)
app.get('/api/portfolio', async (c) => {
  try {
    // Try enhanced API first
    const enhanced = await enhancedAPI.getEnhancedPortfolio();
    
    // Transform to legacy format for backward compatibility
    const portfolio = {
      totalValue: enhanced.totalValue,
      dailyReturn: enhanced.dailyReturn,
      totalReturn: enhanced.totalReturn,
      sharpeRatio: enhanced.sharpeRatio,
      maxDrawdown: enhanced.maxDrawdown,
      assets: enhanced.portfolio.map(asset => ({
        symbol: asset.symbol,
        price: asset.price,
        change: asset.changePercent,
        volume: asset.volume,
        marketCap: asset.marketCap
      }))
    };
    
    return c.json(portfolio);
  } catch (error) {
    console.error('Portfolio API fallback to mock data:', error);
    const portfolio = generateMockPortfolioData();
    return c.json(portfolio);
  }
})

app.get('/api/assets', (c) => {
  const assets = generateMockAssetData()
  return c.json(assets)
})

app.get('/api/backtest', (c) => {
  const result = generateMockBacktestResult()
  return c.json(result)
})

// Enhanced Backtesting with Real Data
app.post('/api/backtest/enhanced', async (c) => {
  try {
    const { strategy, symbols, startDate, endDate, initialCapital } = await c.req.json();
    
    const result = await enhancedAPI.runEnhancedBacktest(
      strategy || 'rl_agent',
      symbols || ['AAPL', 'GOOGL', 'MSFT'],
      startDate || '2023-01-01',
      endDate || '2024-12-31',
      initialCapital || 1000000
    );
    
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error('Enhanced backtest API error:', error);
    return c.json({ error: 'Enhanced backtest failed' }, 500);
  }
})

app.post('/api/backtest/run', async (c) => {
  try {
    const { strategy, startDate, endDate, initialCapital } = await c.req.json();
    
    // Try enhanced backtest first
    const enhanced = await enhancedAPI.runEnhancedBacktest(
      strategy,
      ['AAPL', 'GOOGL', 'MSFT'], // Default symbols
      startDate,
      endDate,
      initialCapital
    );
    
    // Transform to legacy format
    const result: BacktestResult = {
      startDate: enhanced.result.startDate,
      endDate: enhanced.result.endDate,
      initialValue: enhanced.result.initialValue,
      finalValue: enhanced.result.finalValue,
      totalReturn: enhanced.result.totalReturn,
      sharpeRatio: enhanced.result.sharpeRatio,
      maxDrawdown: enhanced.result.maxDrawdown,
      trades: enhanced.result.trades,
      winRate: enhanced.result.winRate
    };
    
    return c.json({ success: true, result, enhanced: enhanced.metrics });
  } catch (error) {
    console.error('Backtest API fallback to mock data:', error);
    
    // Fallback to mock data
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
    };
    
    return c.json({ success: true, result });
  }
})

app.get('/api/optimization/tax', async (c) => {
  try {
    // Try to get real market analysis for tax optimization context
    const marketAnalysis = await enhancedAPI.getMarketAnalysis();
    
    // Enhanced tax optimization with market context
    const taxOptimization = {
      currentTaxBurden: Math.random() * 0.3,
      optimizedTaxBurden: Math.random() * 0.15,
      potentialSavings: Math.random() * 100000,
      marketContext: {
        sentiment: marketAnalysis.marketSentiment,
        volatility: 'medium', // Could be calculated from real data
        taxSeasonFactor: 1.2 // Seasonal adjustment
      },
      strategies: [
        '장기 보유를 통한 장기양도소득세 혜택 (현재 시장 상황 고려)',
        '손실 실현을 통한 세금 손실 상쇄 (포트폴리오 리밸런싱)',
        '연금저축을 통한 소득공제 활용 (세제혜택 극대화)',
        '변액보험을 통한 상속세 절감 (가족 자산관리)',
        `${marketAnalysis.marketSentiment === 'bearish' ? '하락장' : '상승장'} 대응 절세 전략`,
        'AI 예측 기반 최적 매매 타이밍 선택'
      ],
      recommendations: marketAnalysis.topPicks.slice(0, 3).map(pick => ({
        symbol: pick.symbol,
        action: pick.action,
        taxImplication: pick.action === 'sell' ? '양도소득세 고려 필요' : '장기보유 계획 수립'
      }))
    };
    
    return c.json(taxOptimization);
  } catch (error) {
    console.error('Tax optimization API error, using fallback:', error);
    
    // Fallback to original logic
    const taxOptimization = {
      currentTaxBurden: Math.random() * 0.3,
      optimizedTaxBurden: Math.random() * 0.15,
      potentialSavings: Math.random() * 100000,
      strategies: [
        '장기 보유를 통한 장기양도소득세 혜택',
        '손실 실현을 통한 세금 손실 상쇄',
        '연금저축을 통한 소득공제 활용',
        '변액보험을 통한 상속세 절감'
      ]
    };
    
    return c.json(taxOptimization);
  }
})

app.get('/api/insurance/portfolio', async (c) => {
  try {
    // Get risk metrics for insurance optimization context
    const riskMetrics = await enhancedAPI.getRiskMetrics(['AAPL', 'GOOGL', 'MSFT']);
    const marketAnalysis = await enhancedAPI.getMarketAnalysis();
    
    // Enhanced insurance portfolio with market risk integration
    const insurancePortfolio = {
      totalCoverage: Math.random() * 5000000000,
      monthlyPremium: Math.random() * 500000,
      riskProfile: {
        portfolioVaR: riskMetrics.var95,
        marketCorrelation: riskMetrics.beta,
        diversificationBenefit: riskMetrics.diversificationRatio
      },
      policies: [
        { 
          type: '종신보험', 
          coverage: Math.random() * 1000000000, 
          premium: Math.random() * 100000,
          riskAdjustment: 'low' // Based on current risk metrics
        },
        { 
          type: '변액보험', 
          coverage: Math.random() * 2000000000, 
          premium: Math.random() * 200000,
          riskAdjustment: riskMetrics.var95 > 3 ? 'high' : 'medium'
        },
        { 
          type: '연금보험', 
          coverage: Math.random() * 1000000000, 
          premium: Math.random() * 150000,
          riskAdjustment: 'stable'
        }
      ],
      optimization: {
        riskCoverage: Math.min(100, (riskMetrics.var95 * 10 + 50)), // VaR 기반 조정
        returnPotential: marketAnalysis.marketSentiment === 'bullish' ? 85 : 65,
        taxEfficiency: Math.random() * 100
      },
      marketContext: {
        sentiment: marketAnalysis.marketSentiment,
        volatilityAdjustment: riskMetrics.var95 > 3 ? 'increase_coverage' : 'maintain',
        recommendations: [
          `현재 시장 VaR ${riskMetrics.var95.toFixed(2)}% 고려한 보장 조정`,
          marketAnalysis.marketSentiment === 'bearish' ? 
            '하락장 대비 보장성 보험 비중 확대' : 
            '상승장 활용 변액보험 수익률 극대화',
          '포트폴리오 리스크와 연계한 보험료 최적화'
        ]
      }
    };
    
    return c.json(insurancePortfolio);
  } catch (error) {
    console.error('Insurance portfolio API error, using fallback:', error);
    
    // Fallback to original logic
    const insurancePortfolio = {
      totalCoverage: Math.random() * 5000000000,
      monthlyPremium: Math.random() * 500000,
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
    };
    
    return c.json(insurancePortfolio);
  }
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
        <script src="/static/enhanced-app.js"></script>
    </body>
    </html>
  `)
})

export default app
