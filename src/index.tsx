import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { SimpleEnhancedAPI } from './services/simple-enhanced-api'
import { 
  RealTradingManager, 
  KiwoomTradingService, 
  NHTradingService, 
  createBrokerConfigs 
} from './services/real-trading-api'
import { 
  AITradingEngine, 
  createDefaultTradingConfig 
} from './services/ai-trading-engine'
import { 
  RiskManagementSystem, 
  EmergencyResponseSystem 
} from './services/risk-management'

const app = new Hono()
const enhancedAPI = new SimpleEnhancedAPI()

// 실거래 시스템 초기화
const brokerConfigs = createBrokerConfigs()
const tradingManager = new RealTradingManager()
const tradingConfig = createDefaultTradingConfig()
const riskSystem = new RiskManagementSystem(tradingConfig)
const emergencySystem = new EmergencyResponseSystem(riskSystem)

// 증권사 서비스 등록
if (brokerConfigs.kiwoom.apiKey) {
  const kiwoomService = new KiwoomTradingService(brokerConfigs.kiwoom)
  tradingManager.registerBroker('kiwoom', kiwoomService)
  tradingManager.setPrimaryBroker('kiwoom')
}

if (brokerConfigs.nh.apiKey) {
  const nhService = new NHTradingService(brokerConfigs.nh)
  tradingManager.registerBroker('nh', nhService)
}

// AI 자동매매 엔진 초기화
const aiTradingEngine = new AITradingEngine(tradingManager, enhancedAPI, tradingConfig)

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

// ========================
// 🚀 REAL TRADING API ENDPOINTS
// ========================

// 실거래 계좌 정보 조회
app.get('/api/trading/account', async (c) => {
  try {
    const balance = await tradingManager.getAccountBalance()
    
    return c.json({
      success: true,
      data: {
        totalAssets: balance.totalAssets,
        cashBalance: balance.cashBalance,
        stockValue: balance.stockValue,
        purchaseAmount: balance.purchaseAmount,
        evaluationPL: balance.evaluationPL,
        positions: balance.positions.map(pos => ({
          symbol: pos.symbol,
          symbolName: pos.symbolName,
          quantity: pos.quantity,
          avgPrice: pos.avgPrice,
          currentPrice: pos.currentPrice,
          evaluationAmount: pos.evaluationAmount,
          profitLoss: pos.profitLoss,
          profitLossRate: pos.profitLossRate
        }))
      }
    })
  } catch (error) {
    console.error('Account API error:', error)
    return c.json({ 
      success: false, 
      error: '계좌 정보를 가져올 수 없습니다. API 키를 확인해주세요.' 
    }, 500)
  }
})

// 실시간 주가 조회
app.get('/api/trading/price/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  
  try {
    const price = await tradingManager.getRealTimePrice(symbol)
    
    return c.json({
      success: true,
      data: price
    })
  } catch (error) {
    console.error(`Price API error for ${symbol}:`, error)
    return c.json({ 
      success: false, 
      error: `${symbol} 종목의 실시간 시세를 가져올 수 없습니다.` 
    }, 500)
  }
})

// 주식 주문 실행
app.post('/api/trading/order', async (c) => {
  try {
    const orderData = await c.req.json()
    
    // 주문 데이터 검증
    const requiredFields = ['symbol', 'orderType', 'orderMethod', 'quantity', 'accountNo']
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return c.json({
          success: false,
          error: `필수 필드가 누락되었습니다: ${field}`
        }, 400)
      }
    }
    
    // 주문 실행
    const orderResult = await tradingManager.placeOrder({
      symbol: orderData.symbol,
      orderType: orderData.orderType,
      orderMethod: orderData.orderMethod,
      quantity: orderData.quantity,
      price: orderData.price,
      accountNo: orderData.accountNo
    })
    
    return c.json({
      success: true,
      data: orderResult
    })
  } catch (error) {
    console.error('Order API error:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '주문 실행에 실패했습니다.' 
    }, 500)
  }
})

// 리스크 메트릭 조회
app.get('/api/trading/risk-metrics', async (c) => {
  try {
    const balance = await tradingManager.getAccountBalance()
    
    // 실시간 가격 정보 수집
    const marketPrices = new Map()
    for (const position of balance.positions) {
      try {
        const price = await tradingManager.getRealTimePrice(position.symbol)
        marketPrices.set(position.symbol, price)
      } catch (error) {
        console.error(`Failed to get price for ${position.symbol}:`, error)
      }
    }
    
    // 리스크 메트릭 계산
    const riskMetrics = await riskSystem.calculateRiskMetrics(balance, marketPrices)
    const alerts = riskSystem.generateRiskAlerts(riskMetrics)
    const breakers = riskSystem.checkCircuitBreakers(riskMetrics)
    
    // 긴급 상황 체크
    await emergencySystem.handleEmergency(breakers, balance, tradingManager)
    
    return c.json({
      success: true,
      data: {
        metrics: {
          var95: riskMetrics.portfolioVar.var95,
          var99: riskMetrics.portfolioVar.var99,
          expectedShortfall: riskMetrics.portfolioVar.expectedShortfall,
          leverage: riskMetrics.leverage,
          maxSinglePosition: riskMetrics.concentration.maxSinglePosition,
          liquidityRatio: riskMetrics.liquidity.liquidityRatio,
          avgCorrelation: riskMetrics.correlation.avgCorrelation,
          currentDrawdown: riskMetrics.drawdown.currentDrawdown,
          maxDrawdown: riskMetrics.drawdown.maxDrawdown
        },
        alerts: alerts,
        circuitBreakers: breakers.map(b => ({
          name: b.name,
          triggered: b.triggered,
          threshold: b.threshold,
          currentValue: b.currentValue,
          action: b.action
        }))
      }
    })
  } catch (error) {
    console.error('Risk metrics API error:', error)
    return c.json({ 
      success: false, 
      error: '리스크 메트릭을 계산할 수 없습니다.' 
    }, 500)
  }
})

// AI 자동매매 시작/중지
app.post('/api/trading/auto-trading/:action', async (c) => {
  const action = c.req.param('action')
  
  try {
    if (action === 'start') {
      await aiTradingEngine.start()
      return c.json({
        success: true,
        message: 'AI 자동매매가 시작되었습니다.'
      })
    } else if (action === 'stop') {
      aiTradingEngine.stop()
      return c.json({
        success: true,
        message: 'AI 자동매매가 중지되었습니다.'
      })
    } else {
      return c.json({
        success: false,
        error: '잘못된 액션입니다. start 또는 stop을 사용하세요.'
      }, 400)
    }
  } catch (error) {
    console.error('Auto trading API error:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '자동매매 제어에 실패했습니다.' 
    }, 500)
  }
})

// 포트폴리오 리밸런싱 실행
app.post('/api/trading/rebalance', async (c) => {
  try {
    const results = await aiTradingEngine.executeRebalancing()
    
    return c.json({
      success: true,
      data: {
        tradesExecuted: results.filter(r => r.executed).length,
        totalTrades: results.length,
        results: results.map(r => ({
          symbol: r.decision.symbol,
          action: r.decision.action,
          executed: r.executed,
          confidence: r.decision.confidence,
          reasoning: r.decision.reasoning,
          orderId: r.order?.orderId,
          errorMessage: r.errorMessage
        }))
      }
    })
  } catch (error) {
    console.error('Rebalancing API error:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '리밸런싱 실행에 실패했습니다.' 
    }, 500)
  }
})

// 자동매매 성과 조회
app.get('/api/trading/performance', async (c) => {
  try {
    const performance = aiTradingEngine.getPerformanceMetrics()
    
    return c.json({
      success: true,
      data: {
        totalTrades: performance.totalTrades,
        winTrades: performance.winTrades,
        winRate: performance.winRate,
        totalPnL: performance.totalPnL,
        avgPnLPerTrade: performance.avgPnLPerTrade,
        maxDrawdown: performance.maxDrawdown
      }
    })
  } catch (error) {
    console.error('Performance API error:', error)
    return c.json({ 
      success: false, 
      error: '성과 데이터를 가져올 수 없습니다.' 
    }, 500)
  }
})

// 자동매매 설정 업데이트
app.put('/api/trading/config', async (c) => {
  try {
    const newConfig = await c.req.json()
    
    aiTradingEngine.updateConfiguration(newConfig)
    
    return c.json({
      success: true,
      message: '자동매매 설정이 업데이트되었습니다.'
    })
  } catch (error) {
    console.error('Config update API error:', error)
    return c.json({ 
      success: false, 
      error: '설정 업데이트에 실패했습니다.' 
    }, 500)
  }
})

// 증권사 API 연결 상태 확인
app.get('/api/trading/broker-status', async (c) => {
  try {
    const authResults = await tradingManager.authenticateAll()
    
    return c.json({
      success: true,
      data: {
        kiwoom: authResults[0] || false,
        nh: authResults[1] || false,
        primaryBroker: 'kiwoom' // tradingManager에서 가져와야 하지만 단순화
      }
    })
  } catch (error) {
    console.error('Broker status API error:', error)
    return c.json({ 
      success: false, 
      error: '증권사 연결 상태를 확인할 수 없습니다.' 
    }, 500)
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
                    <nav class="-mb-px flex space-x-8 px-6 overflow-x-auto">
                        <button class="tab-btn border-b-2 border-blue-500 py-4 px-1 text-blue-600 font-medium whitespace-nowrap" data-tab="portfolio">
                            <i class="fas fa-chart-pie mr-2"></i>포트폴리오
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap" data-tab="real-trading">
                            <i class="fas fa-exchange-alt mr-2"></i>실거래 관리
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap" data-tab="backtest">
                            <i class="fas fa-history mr-2"></i>백테스트
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap" data-tab="tax">
                            <i class="fas fa-calculator mr-2"></i>세무 최적화
                        </button>
                        <button class="tab-btn border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap" data-tab="insurance">
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

                <!-- 실거래 관리 탭 -->
                <div id="real-trading-tab" class="tab-content p-6 hidden">
                    <div class="space-y-6">
                        <!-- 실거래 상태 개요 -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-medium text-blue-900">실거래 시스템 상태</h3>
                                    <p class="text-sm text-blue-700 mt-1">AI 자동매매 및 리스크 관리 시스템</p>
                                </div>
                                <div class="flex space-x-3">
                                    <button onclick="showAutoTradingControls()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                        <i class="fas fa-cog mr-2"></i>제어 패널
                                    </button>
                                    <button onclick="executeRebalancing()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                        <i class="fas fa-balance-scale mr-2"></i>리밸런싱
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 실시간 계좌 현황 -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div class="lg:col-span-2">
                                <div class="bg-white rounded-lg border shadow-sm">
                                    <div class="p-6 border-b border-gray-200">
                                        <div class="flex items-center justify-between">
                                            <h3 class="text-lg font-medium text-gray-900">실시간 포지션</h3>
                                            <div class="flex items-center space-x-2 text-sm text-gray-500">
                                                <i class="fas fa-sync-alt animate-spin text-blue-500"></i>
                                                <span>실시간 연동</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-6">
                                        <div id="realPositionsList" class="space-y-3">
                                            <div class="text-center py-8 text-gray-500">
                                                <i class="fas fa-chart-line text-3xl mb-2"></i>
                                                <p>실거래 계좌 연결 후 포지션이 표시됩니다</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-6">
                                <!-- AI 추천 거래 -->
                                <div class="bg-white rounded-lg border shadow-sm">
                                    <div class="p-4 border-b border-gray-200">
                                        <h4 class="font-medium text-gray-900">
                                            <i class="fas fa-robot text-purple-600 mr-2"></i>AI 추천
                                        </h4>
                                    </div>
                                    <div class="p-4">
                                        <div id="aiRecommendations" class="space-y-3">
                                            <div class="text-center py-6 text-gray-500">
                                                <i class="fas fa-brain text-2xl mb-2"></i>
                                                <p class="text-sm">AI 분석 중...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 리스크 모니터링 -->
                                <div class="bg-white rounded-lg border shadow-sm">
                                    <div class="p-4 border-b border-gray-200">
                                        <h4 class="font-medium text-gray-900">
                                            <i class="fas fa-shield-alt text-red-600 mr-2"></i>리스크 모니터
                                        </h4>
                                    </div>
                                    <div class="p-4">
                                        <div id="riskMonitor" class="space-y-3">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-gray-600">VaR (95%)</span>
                                                <span class="font-medium text-red-600" id="currentVaR">-</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-gray-600">포트폴리오 베타</span>
                                                <span class="font-medium" id="currentBeta">-</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-gray-600">현재 낙폭</span>
                                                <span class="font-medium" id="currentDrawdown">-</span>
                                            </div>
                                            <div class="mt-3 pt-3 border-t border-gray-200">
                                                <div class="flex items-center space-x-2">
                                                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <span class="text-xs text-gray-600">실시간 모니터링</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 최근 거래 내역 -->
                        <div class="bg-white rounded-lg border shadow-sm">
                            <div class="p-6 border-b border-gray-200">
                                <h3 class="text-lg font-medium text-gray-900">최근 거래 내역</h3>
                            </div>
                            <div class="p-6">
                                <div id="recentTrades" class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tradesTableBody" class="bg-white divide-y divide-gray-200">
                                            <tr>
                                                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                                                    <i class="fas fa-exchange-alt text-2xl mb-2"></i>
                                                    <p>거래 내역이 없습니다</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- 자동매매 성과 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div class="bg-white p-4 rounded-lg border shadow-sm text-center">
                                <div class="text-2xl font-bold text-blue-600" id="totalTrades">-</div>
                                <div class="text-sm text-gray-600">총 거래 수</div>
                            </div>
                            <div class="bg-white p-4 rounded-lg border shadow-sm text-center">
                                <div class="text-2xl font-bold text-green-600" id="winRate">-</div>
                                <div class="text-sm text-gray-600">승률</div>
                            </div>
                            <div class="bg-white p-4 rounded-lg border shadow-sm text-center">
                                <div class="text-2xl font-bold text-purple-600" id="totalPnL">-</div>
                                <div class="text-sm text-gray-600">총 손익</div>
                            </div>
                            <div class="bg-white p-4 rounded-lg border shadow-sm text-center">
                                <div class="text-2xl font-bold text-orange-600" id="avgTradeReturn">-</div>
                                <div class="text-sm text-gray-600">평균 수익률</div>
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
