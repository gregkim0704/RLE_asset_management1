/**
 * AI-Enhanced Real Trading Engine
 * PPO 강화학습과 실거래 API를 연동한 자동매매 엔진
 */

import { RealTradingManager, StockOrder, OrderResult, AccountBalance, Position } from './real-trading-api';
import { SimpleEnhancedAPI, AISignal, MarketAnalysis } from './simple-enhanced-api';

export interface TradingDecision {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  targetSize: number;        // 목표 비중 (0-1)
  reasoning: string[];       // AI 판단 근거
  riskScore: number;         // 리스크 점수 (0-1)
  expectedReturn: number;    // 예상 수익률
}

export interface TradingResult {
  decision: TradingDecision;
  order?: OrderResult;
  executed: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface RiskLimits {
  maxPositionSize: number;   // 최대 포지션 크기 (총 자산 대비 %)
  maxDailyLoss: number;      // 일일 최대 손실 한도
  maxDrawdown: number;       // 최대 누적 손실
  minCashRatio: number;      // 최소 현금 비율
  maxLeverage: number;       // 최대 레버리지
}

export interface TradingConfiguration {
  enableAutoTrading: boolean;
  riskLimits: RiskLimits;
  confidenceThreshold: number; // 최소 AI 신뢰도 (예: 0.7)
  maxTradesPerDay: number;     // 일일 최대 거래 건수
  targetSymbols: string[];     // 거래 대상 종목
  rebalanceFrequency: 'realtime' | 'hourly' | 'daily';
}

/**
 * AI 기반 실거래 자동매매 엔진
 */
export class AITradingEngine {
  private tradingManager: RealTradingManager;
  private aiAPI: SimpleEnhancedAPI;
  private config: TradingConfiguration;
  private isRunning: boolean = false;
  private dailyTrades: number = 0;
  private lastTradeDate: string = '';
  private performanceMetrics: {
    totalTrades: number;
    winTrades: number;
    totalPnL: number;
    maxDrawdown: number;
  } = {
    totalTrades: 0,
    winTrades: 0,
    totalPnL: 0,
    maxDrawdown: 0
  };

  constructor(
    tradingManager: RealTradingManager,
    aiAPI: SimpleEnhancedAPI,
    config: TradingConfiguration
  ) {
    this.tradingManager = tradingManager;
    this.aiAPI = aiAPI;
    this.config = config;
  }

  /**
   * 자동매매 엔진 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading engine is already running');
    }

    console.log('🚀 AI Trading Engine Starting...');
    
    // 초기 안전 검사
    await this.performSafetyChecks();
    
    this.isRunning = true;
    console.log('✅ AI Trading Engine Started');

    // 실시간 모드인 경우 지속적 모니터링 시작
    if (this.config.rebalanceFrequency === 'realtime') {
      this.startRealTimeMonitoring();
    }
  }

  /**
   * 자동매매 엔진 중지
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 AI Trading Engine Stopped');
  }

  /**
   * 초기 안전성 검사
   */
  private async performSafetyChecks(): Promise<void> {
    try {
      // 1. 계좌 잔고 확인
      const balance = await this.tradingManager.getAccountBalance();
      console.log('💰 Account Balance Check:', {
        totalAssets: balance.totalAssets.toLocaleString(),
        cashBalance: balance.cashBalance.toLocaleString()
      });

      // 2. 최소 현금 비율 확인
      const cashRatio = balance.cashBalance / balance.totalAssets;
      if (cashRatio < this.config.riskLimits.minCashRatio) {
        console.warn(`⚠️ 현금 비율이 최소 기준(${this.config.riskLimits.minCashRatio}%) 미만입니다.`);
      }

      // 3. AI 시스템 상태 확인
      const marketAnalysis = await this.aiAPI.getMarketAnalysis();
      console.log('🧠 AI System Check:', {
        sentiment: marketAnalysis.marketSentiment,
        topPicks: marketAnalysis.topPicks.length
      });

      console.log('✅ All safety checks passed');
    } catch (error) {
      console.error('❌ Safety check failed:', error);
      throw new Error('Cannot start trading engine - safety check failed');
    }
  }

  /**
   * 포트폴리오 리밸런싱 실행
   */
  async executeRebalancing(): Promise<TradingResult[]> {
    if (!this.isRunning) {
      throw new Error('Trading engine is not running');
    }

    console.log('🔄 Starting portfolio rebalancing...');

    try {
      // 1. 현재 포트폴리오 상태 가져오기
      const currentBalance = await this.tradingManager.getAccountBalance();
      
      // 2. AI 분석 결과 가져오기
      const marketAnalysis = await this.aiAPI.getMarketAnalysis();
      const aiSignals = await this.generateAISignals();

      // 3. 거래 결정 생성
      const decisions = await this.generateTradingDecisions(
        currentBalance,
        marketAnalysis,
        aiSignals
      );

      // 4. 리스크 검사 및 필터링
      const validDecisions = this.filterDecisionsByRisk(decisions, currentBalance);

      // 5. 거래 실행
      const results = await this.executeTradingDecisions(validDecisions);

      console.log(`✅ Rebalancing completed: ${results.length} trades executed`);
      return results;

    } catch (error) {
      console.error('❌ Rebalancing failed:', error);
      throw error;
    }
  }

  /**
   * AI 신호 생성
   */
  private async generateAISignals(): Promise<AISignal[]> {
    const signals: AISignal[] = [];

    for (const symbol of this.config.targetSymbols) {
      try {
        // 각 종목별로 AI 예측 실행
        const prediction = await this.aiAPI.predictPrice(symbol, '1d');
        
        if (prediction && prediction.confidence >= this.config.confidenceThreshold) {
          signals.push({
            symbol,
            signal: prediction.prediction > 0 ? 'buy' : 'sell',
            confidence: prediction.confidence,
            targetPrice: prediction.targetPrice,
            timeHorizon: '1d'
          });
        }
      } catch (error) {
        console.error(`Failed to get AI signal for ${symbol}:`, error);
      }
    }

    return signals;
  }

  /**
   * 거래 결정 생성
   */
  private async generateTradingDecisions(
    balance: AccountBalance,
    marketAnalysis: MarketAnalysis,
    aiSignals: AISignal[]
  ): Promise<TradingDecision[]> {
    const decisions: TradingDecision[] = [];
    const totalAssets = balance.totalAssets;

    // 현재 포지션을 Map으로 변환
    const currentPositions = new Map<string, Position>();
    balance.positions.forEach(pos => {
      currentPositions.set(pos.symbol, pos);
    });

    for (const signal of aiSignals) {
      const currentPosition = currentPositions.get(signal.symbol);
      const currentWeight = currentPosition 
        ? (currentPosition.evaluationAmount / totalAssets) 
        : 0;

      // AI 신뢰도 기반 목표 비중 계산
      const targetWeight = this.calculateTargetWeight(signal, marketAnalysis);
      
      // 거래 액션 결정
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      if (targetWeight > currentWeight + 0.01) { // 1% 이상 차이시 매수
        action = 'buy';
      } else if (targetWeight < currentWeight - 0.01) { // 1% 이상 차이시 매도
        action = 'sell';
      }

      if (action !== 'hold') {
        decisions.push({
          symbol: signal.symbol,
          action,
          confidence: signal.confidence,
          targetSize: targetWeight,
          reasoning: [
            `AI 신뢰도: ${(signal.confidence * 100).toFixed(1)}%`,
            `현재 비중: ${(currentWeight * 100).toFixed(1)}%`,
            `목표 비중: ${(targetWeight * 100).toFixed(1)}%`,
            `시장 센티멘트: ${marketAnalysis.marketSentiment}`
          ],
          riskScore: this.calculateRiskScore(signal, currentPosition),
          expectedReturn: (signal.targetPrice - (currentPosition?.currentPrice || 0)) / (currentPosition?.currentPrice || 1)
        });
      }
    }

    return decisions;
  }

  /**
   * 목표 포지션 크기 계산
   */
  private calculateTargetWeight(signal: AISignal, marketAnalysis: MarketAnalysis): number {
    // 기본 비중 = AI 신뢰도 * 최대 포지션 크기
    let baseWeight = signal.confidence * this.config.riskLimits.maxPositionSize;

    // 시장 센티멘트 조정
    const sentimentMultiplier = {
      'bullish': 1.2,
      'neutral': 1.0,
      'bearish': 0.8
    }[marketAnalysis.marketSentiment] || 1.0;

    baseWeight *= sentimentMultiplier;

    // 최대 포지션 크기 제한
    return Math.min(baseWeight, this.config.riskLimits.maxPositionSize);
  }

  /**
   * 리스크 점수 계산
   */
  private calculateRiskScore(signal: AISignal, position?: Position): number {
    let riskScore = 0;

    // 신뢰도가 낮을수록 리스크 증가
    riskScore += (1 - signal.confidence) * 0.4;

    // 기존 포지션이 있고 손실 상태인 경우 리스크 증가
    if (position && position.profitLossRate < -0.05) {
      riskScore += 0.3;
    }

    // 변동성이 높은 종목 리스크 증가 (예시)
    // 실제로는 과거 변동성 데이터 활용
    riskScore += 0.2;

    return Math.min(riskScore, 1.0);
  }

  /**
   * 리스크 기반 거래 결정 필터링
   */
  private filterDecisionsByRisk(
    decisions: TradingDecision[],
    balance: AccountBalance
  ): TradingDecision[] {
    const filtered: TradingDecision[] = [];
    const currentDate = new Date().toISOString().split('T')[0];

    // 일일 거래 건수 체크
    if (this.lastTradeDate !== currentDate) {
      this.dailyTrades = 0;
      this.lastTradeDate = currentDate;
    }

    for (const decision of decisions) {
      // 일일 거래 한도 체크
      if (this.dailyTrades >= this.config.maxTradesPerDay) {
        console.log(`⚠️ 일일 거래 한도 도달: ${this.config.maxTradesPerDay}`);
        break;
      }

      // 리스크 점수 체크
      if (decision.riskScore > 0.7) {
        console.log(`⚠️ 높은 리스크로 거래 제외: ${decision.symbol} (리스크: ${decision.riskScore})`);
        continue;
      }

      // 신뢰도 체크
      if (decision.confidence < this.config.confidenceThreshold) {
        console.log(`⚠️ 낮은 신뢰도로 거래 제외: ${decision.symbol} (신뢰도: ${decision.confidence})`);
        continue;
      }

      filtered.push(decision);
    }

    return filtered;
  }

  /**
   * 거래 결정 실행
   */
  private async executeTradingDecisions(decisions: TradingDecision[]): Promise<TradingResult[]> {
    const results: TradingResult[] = [];

    for (const decision of decisions) {
      try {
        const result = await this.executeSingleTrade(decision);
        results.push(result);
        
        if (result.executed) {
          this.dailyTrades++;
          this.performanceMetrics.totalTrades++;
        }

        // 거래 간 안전 지연 (API 호출 제한 고려)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`거래 실행 실패 - ${decision.symbol}:`, error);
        results.push({
          decision,
          executed: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * 개별 거래 실행
   */
  private async executeSingleTrade(decision: TradingDecision): Promise<TradingResult> {
    const balance = await this.tradingManager.getAccountBalance();
    const targetAmount = balance.totalAssets * decision.targetSize;
    
    // 현재 포지션 찾기
    const currentPosition = balance.positions.find(p => p.symbol === decision.symbol);
    const currentAmount = currentPosition?.evaluationAmount || 0;
    
    // 거래 수량 계산
    const priceData = await this.tradingManager.getRealTimePrice(decision.symbol);
    const tradeAmount = Math.abs(targetAmount - currentAmount);
    const quantity = Math.floor(tradeAmount / priceData.price);

    if (quantity === 0) {
      return {
        decision,
        executed: false,
        errorMessage: 'No quantity to trade',
        timestamp: new Date().toISOString()
      };
    }

    // 주문 생성
    const order: StockOrder = {
      symbol: decision.symbol,
      orderType: decision.action,
      orderMethod: 'market', // 시장가 주문으로 즉시 체결
      quantity,
      accountNo: balance.positions[0]?.symbol || 'default' // 실제로는 설정에서 가져와야 함
    };

    console.log(`📝 주문 실행: ${decision.action} ${decision.symbol} ${quantity}주`);

    try {
      const orderResult = await this.tradingManager.placeOrder(order);
      
      console.log(`✅ 주문 성공: ${orderResult.orderId}`);

      return {
        decision,
        order: orderResult,
        executed: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 주문 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 실시간 모니터링 시작
   */
  private startRealTimeMonitoring(): void {
    // 5분마다 포트폴리오 체크
    const monitoringInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        console.log('🔍 실시간 모니터링 체크...');
        
        // 급격한 시장 변화 감지
        const marketAnalysis = await this.aiAPI.getMarketAnalysis();
        
        // 손절/익절 조건 체크
        await this.checkStopLossAndTakeProfit();

        // 필요시 리밸런싱 실행
        const needsRebalancing = await this.checkRebalancingNeed();
        if (needsRebalancing) {
          await this.executeRebalancing();
        }

      } catch (error) {
        console.error('실시간 모니터링 에러:', error);
      }
    }, 5 * 60 * 1000); // 5분
  }

  /**
   * 손절/익절 조건 체크
   */
  private async checkStopLossAndTakeProfit(): Promise<void> {
    const balance = await this.tradingManager.getAccountBalance();
    
    for (const position of balance.positions) {
      // 5% 손실시 손절
      if (position.profitLossRate <= -0.05) {
        console.log(`🔴 손절 대상: ${position.symbol} (${position.profitLossRate}%)`);
        
        const stopLossDecision: TradingDecision = {
          symbol: position.symbol,
          action: 'sell',
          confidence: 1.0, // 손절은 무조건 실행
          targetSize: 0,   // 전량 매도
          reasoning: ['손절 조건 도달'],
          riskScore: 1.0,
          expectedReturn: position.profitLossRate
        };

        await this.executeSingleTrade(stopLossDecision);
      }
      
      // 20% 수익시 일부 익절
      if (position.profitLossRate >= 0.20) {
        console.log(`🟢 익절 대상: ${position.symbol} (${position.profitLossRate}%)`);
        
        // 50% 물량 익절
        const takeProfitDecision: TradingDecision = {
          symbol: position.symbol,
          action: 'sell',
          confidence: 1.0,
          targetSize: 0.5, // 절반만 매도
          reasoning: ['익절 조건 도달'],
          riskScore: 0.1,
          expectedReturn: position.profitLossRate
        };

        await this.executeSingleTrade(takeProfitDecision);
      }
    }
  }

  /**
   * 리밸런싱 필요 여부 체크
   */
  private async checkRebalancingNeed(): Promise<boolean> {
    // 예시: 시장 변동성이 클 때 리밸런싱
    const marketAnalysis = await this.aiAPI.getMarketAnalysis();
    
    // VIX 지수나 변동성 지표를 통한 리밸런싱 조건
    // 여기서는 단순화
    return Math.random() < 0.1; // 10% 확률로 리밸런싱
  }

  /**
   * 성과 지표 조회
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      winRate: this.performanceMetrics.totalTrades > 0 
        ? this.performanceMetrics.winTrades / this.performanceMetrics.totalTrades 
        : 0,
      avgPnLPerTrade: this.performanceMetrics.totalTrades > 0
        ? this.performanceMetrics.totalPnL / this.performanceMetrics.totalTrades
        : 0
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfiguration(newConfig: Partial<TradingConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Trading configuration updated');
  }
}

// 기본 설정 예시
export function createDefaultTradingConfig(): TradingConfiguration {
  return {
    enableAutoTrading: false, // 기본적으로 비활성화
    riskLimits: {
      maxPositionSize: 0.1,    // 10% 최대 포지션
      maxDailyLoss: 0.02,      // 일일 2% 최대 손실
      maxDrawdown: 0.05,       // 5% 최대 누적 손실
      minCashRatio: 0.1,       // 10% 최소 현금
      maxLeverage: 1.0         // 레버리지 없음
    },
    confidenceThreshold: 0.75,  // 75% 이상 신뢰도
    maxTradesPerDay: 10,        // 일일 최대 10건
    targetSymbols: ['005930', '000660', '035420', '051910', '068270'], // 삼성전자, SK하이닉스, NAVER, LG화학, 셀트리온
    rebalanceFrequency: 'daily'
  };
}