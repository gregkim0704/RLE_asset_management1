// Simplified Enhanced API for Cloudflare Workers Environment
import { DEFAULT_SYMBOLS } from '../utils/constants';

/**
 * Simplified Enhanced API Service
 * - Works in Cloudflare Workers environment
 * - Provides enhanced mock data with realistic patterns
 * - Fallback service for when full data providers aren't available
 */
export class SimpleEnhancedAPI {
  private cache = new Map();
  
  constructor() {
    console.log('🚀 Simple Enhanced API Service initialized');
  }

  /**
   * Enhanced portfolio with AI predictions (mock)
   */
  async getEnhancedPortfolio() {
    const cacheKey = 'enhanced_portfolio';
    const cached = this.getFromCache(cacheKey, 30000);
    
    if (cached) {
      return cached;
    }

    // Generate realistic portfolio data
    const portfolio = this.generateRealisticPortfolio();
    const aiPredictions = this.generateAIPredictions(portfolio);
    const metrics = this.calculatePortfolioMetrics(portfolio);
    
    const result = {
      portfolio,
      aiPredictions,
      ...metrics,
      lastUpdate: new Date().toISOString()
    };
    
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Market analysis with sentiment
   */
  async getMarketAnalysis() {
    const cacheKey = 'market_analysis';
    const cached = this.getFromCache(cacheKey, 300000);
    
    if (cached) {
      return cached;
    }

    const sentiment = this.generateMarketSentiment();
    const sectorAnalysis = this.generateSectorAnalysis();
    const topPicks = this.generateTopPicks();
    const riskAlert = this.generateRiskAlerts();
    const economicIndicators = this.generateEconomicIndicators();
    
    const result = {
      marketSentiment: sentiment,
      sectorAnalysis,
      topPicks,
      riskAlert,
      economicIndicators,
      newsImpact: []
    };
    
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Enhanced backtest with realistic results
   */
  async runEnhancedBacktest(
    strategy: string = 'rl_agent',
    symbols: string[] = DEFAULT_SYMBOLS,
    startDate: string = '2023-01-01',
    endDate: string = '2024-12-31',
    initialCapital: number = 1000000
  ) {
    const cacheKey = `backtest_${strategy}_${symbols.join('_')}`;
    const cached = this.getFromCache(cacheKey, 3600000);
    
    if (cached) {
      return cached;
    }

    const result = this.generateBacktestResults(strategy, initialCapital);
    const performance = this.generatePerformanceTimeSeries(initialCapital, result.finalValue);
    const metrics = this.calculateAdvancedMetrics(result, performance);
    
    const backtestResult = {
      result,
      trades: this.generateTrades(result.trades),
      performance,
      metrics
    };
    
    this.setCache(cacheKey, backtestResult);
    return backtestResult;
  }

  /**
   * Risk metrics calculation
   */
  async getRiskMetrics(symbols: string[]) {
    const cacheKey = `risk_${symbols.join('_')}`;
    const cached = this.getFromCache(cacheKey, 600000);
    
    if (cached) {
      return cached;
    }

    const riskMetrics = {
      var95: this.generateVaR(0.95),
      var99: this.generateVaR(0.99),
      expectedShortfall: this.generateVaR(0.95) * 1.3,
      beta: 0.8 + Math.random() * 0.8, // 0.8 - 1.6
      correlation: this.generateCorrelationMatrix(symbols.length),
      diversificationRatio: 0.7 + Math.random() * 0.3,
      riskContribution: symbols.map(symbol => ({
        symbol,
        contribution: Math.random() * 100
      }))
    };
    
    this.setCache(cacheKey, riskMetrics);
    return riskMetrics;
  }

  // Helper methods for generating realistic data

  private generateRealisticPortfolio() {
    return DEFAULT_SYMBOLS.slice(0, 6).map(symbol => {
      const basePrice = this.getBasePrice(symbol);
      const changePercent = this.generateRealisticChange();
      const quantity = Math.floor(Math.random() * 200) + 50;
      const costBasis = basePrice * (0.85 + Math.random() * 0.3); // ±15% from current
      
      return {
        symbol,
        price: basePrice,
        change: (changePercent / 100) * basePrice,
        changePercent,
        volume: Math.floor(Math.random() * 5000000) + 1000000,
        marketCap: Math.random() * 2000000000000, // Up to $2T
        high: basePrice * (1 + Math.random() * 0.03),
        low: basePrice * (1 - Math.random() * 0.03),
        open: basePrice * (0.98 + Math.random() * 0.04),
        previousClose: basePrice - (changePercent / 100) * basePrice,
        timestamp: new Date().toISOString(),
        quantity,
        totalValue: basePrice * quantity,
        weight: 1/6 + (Math.random() - 0.5) * 0.1, // ~16.7% ± 5%
        costBasis,
        unrealizedPnL: (basePrice - costBasis) * quantity,
        unrealizedPnLPercent: ((basePrice - costBasis) / costBasis) * 100
      };
    });
  }

  private generateAIPredictions(portfolio: any[]) {
    return portfolio.map(asset => ({
      symbol: asset.symbol,
      prediction: (Math.random() - 0.5) * 20, // ±10%
      confidence: 0.3 + Math.random() * 0.6, // 30-90%
      action: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'hold' : 'sell',
      targetPrice: asset.price * (1 + (Math.random() - 0.5) * 0.2),
      stopLoss: asset.price * (0.9 + Math.random() * 0.1),
      timeHorizon: Math.floor(Math.random() * 30) + 5, // 5-35 days
      features: {
        prices: Array(20).fill(0).map(() => asset.price * (0.95 + Math.random() * 0.1)),
        technicals: Array(8).fill(0).map(() => Math.random() * 100),
        volume: Array(5).fill(0).map(() => asset.volume * (0.8 + Math.random() * 0.4)),
        sentiment: Math.random() * 2 - 1,
        macroeconomic: [Math.random(), Math.random(), Math.random()],
        timestamp: new Date().toISOString()
      },
      modelVersion: 'RL-PPO-v2.0',
      timestamp: new Date().toISOString()
    }));
  }

  private calculatePortfolioMetrics(portfolio: any[]) {
    const totalValue = portfolio.reduce((sum, asset) => sum + asset.totalValue, 0);
    const totalPnL = portfolio.reduce((sum, asset) => sum + asset.unrealizedPnL, 0);
    const dailyReturn = (totalPnL / (totalValue - totalPnL)) * 100;
    
    return {
      totalValue,
      dailyReturn,
      totalReturn: dailyReturn * 30 + (Math.random() - 0.5) * 20, // Monthly simulation
      sharpeRatio: 1.2 + Math.random() * 0.8, // 1.2 - 2.0
      maxDrawdown: -(Math.random() * 15 + 5) // -5% to -20%
    };
  }

  private generateMarketSentiment(): 'bullish' | 'bearish' | 'neutral' {
    const rand = Math.random();
    if (rand > 0.6) return 'bullish';
    if (rand < 0.3) return 'bearish';
    return 'neutral';
  }

  private generateSectorAnalysis() {
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'];
    
    return sectors.map(sector => ({
      sector,
      performance: (Math.random() - 0.5) * 20,
      momentum: Math.random() * 100,
      volatility: Math.random() * 30 + 10,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      recommendation: ['Buy', 'Hold', 'Sell'][Math.floor(Math.random() * 3)]
    }));
  }

  private generateTopPicks() {
    return DEFAULT_SYMBOLS.slice(0, 3).map(symbol => ({
      symbol,
      prediction: Math.random() * 15 + 5, // 5-20% positive
      confidence: 0.7 + Math.random() * 0.3, // 70-100%
      action: 'buy' as const,
      targetPrice: this.getBasePrice(symbol) * (1.1 + Math.random() * 0.2),
      stopLoss: this.getBasePrice(symbol) * 0.9,
      timeHorizon: 30,
      features: {} as any,
      modelVersion: 'RL-PPO-v2.0',
      timestamp: new Date().toISOString()
    }));
  }

  private generateRiskAlerts(): string[] {
    const alerts = [];
    
    if (Math.random() > 0.7) {
      alerts.push('TSLA: 높은 변동성 감지 (8.5%)');
    }
    
    if (Math.random() > 0.8) {
      alerts.push('NVDA: AI 모델 신뢰도 낮음 (45%)');
    }
    
    if (Math.random() > 0.6) {
      alerts.push('시장 전반: VIX 상승 추세');
    }
    
    return alerts;
  }

  private generateEconomicIndicators() {
    return [
      { name: 'GDP 성장률', value: 2.1, change: 0.2, trend: 'up' },
      { name: '실업률', value: 3.7, change: -0.1, trend: 'down' },
      { name: '인플레이션', value: 3.2, change: 0.3, trend: 'up' },
      { name: '기준금리', value: 5.25, change: 0, trend: 'stable' },
      { name: 'VIX', value: 18.5, change: -1.2, trend: 'down' }
    ];
  }

  private generateBacktestResults(strategy: string, initialCapital: number) {
    const strategyMultipliers = {
      'rl_agent': { return: 0.15, volatility: 0.8, sharpe: 1.3 },
      'momentum': { return: 0.12, volatility: 1.2, sharpe: 1.0 },
      'mean_reversion': { return: 0.08, volatility: 0.6, sharpe: 1.1 },
      'buy_hold': { return: 0.10, volatility: 1.0, sharpe: 0.9 }
    };
    
    const multiplier = strategyMultipliers[strategy] || strategyMultipliers['rl_agent'];
    const baseReturn = multiplier.return + (Math.random() - 0.5) * 0.1;
    
    return {
      startDate: '2023-01-01',
      endDate: '2024-12-31',
      initialValue: initialCapital,
      finalValue: initialCapital * (1 + baseReturn),
      totalReturn: baseReturn * 100,
      sharpeRatio: multiplier.sharpe + (Math.random() - 0.5) * 0.4,
      maxDrawdown: -(Math.random() * 15 + 5) * multiplier.volatility,
      trades: Math.floor(Math.random() * 500) + 100,
      winRate: 0.45 + Math.random() * 0.25
    };
  }

  private generatePerformanceTimeSeries(initialValue: number, finalValue: number) {
    const days = 252; // Trading days in a year
    const totalReturn = (finalValue - initialValue) / initialValue;
    const dailyReturn = Math.pow(1 + totalReturn, 1/days) - 1;
    
    const performance = [initialValue];
    let current = initialValue;
    
    for (let i = 1; i < days; i++) {
      // Add some randomness while trending toward final value
      const noise = (Math.random() - 0.5) * 0.02; // ±1% daily noise
      const trend = dailyReturn;
      current *= (1 + trend + noise);
      performance.push(current);
    }
    
    // Ensure we end up close to the target
    performance[days - 1] = finalValue;
    
    return performance;
  }

  private generateTrades(numTrades: number) {
    const trades = [];
    
    for (let i = 0; i < Math.min(numTrades, 10); i++) { // Limit to 10 trades for demo
      trades.push({
        symbol: DEFAULT_SYMBOLS[Math.floor(Math.random() * DEFAULT_SYMBOLS.length)],
        action: Math.random() > 0.5 ? 'buy' : 'sell',
        quantity: Math.floor(Math.random() * 100) + 10,
        price: Math.random() * 200 + 50,
        timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return trades;
  }

  private calculateAdvancedMetrics(result: any, performance: number[]) {
    const returns = performance.slice(1).map((val, i) => (val - performance[i]) / performance[i]);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252) * 100; // Annualized
    
    return {
      totalReturn: result.totalReturn,
      sharpeRatio: result.sharpeRatio,
      maxDrawdown: Math.abs(result.maxDrawdown),
      winRate: result.winRate,
      volatility,
      calmarRatio: result.totalReturn / Math.abs(result.maxDrawdown)
    };
  }

  private generateVaR(confidence: number): number {
    const baseVaR = confidence === 0.95 ? 2.5 : 4.0;
    return baseVaR + (Math.random() - 0.5) * 1.0;
  }

  private generateCorrelationMatrix(size: number): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (matrix[j] && matrix[j][i] !== undefined) {
          matrix[i][j] = matrix[j][i]; // Symmetric
        } else {
          matrix[i][j] = Math.random() * 0.8 + 0.1; // 0.1 to 0.9 correlation
        }
      }
    }
    
    return matrix;
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'AAPL': 175,
      'GOOGL': 135,
      'MSFT': 360,
      'TSLA': 240,
      'NVDA': 420,
      'AMZN': 140
    };
    
    const base = basePrices[symbol] || 100;
    return base * (0.95 + Math.random() * 0.1); // ±5% variation
  }

  private generateRealisticChange(): number {
    // Generate realistic daily price changes following a normal-ish distribution
    const u = Math.random();
    const v = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    
    // Scale to typical daily stock movements (mean=0, std=2%)
    return z0 * 2;
  }

  // Cache management
  private getFromCache(key: string, ttl: number = 60000): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    
    // Simple cache cleanup - keep only recent entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}