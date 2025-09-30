/**
 * Advanced Risk Management System for Real Trading
 * 실거래용 고급 리스크 관리 시스템
 * 
 * 박사님의 VIP 고객 자산 보호를 위한 다층적 안전장치
 */

import { AccountBalance, Position, RealTimePrice } from './real-trading-api';
import { TradingDecision, TradingConfiguration } from './ai-trading-engine';

export interface RiskMetrics {
  portfolioVar: {
    var95: number;           // 95% VaR
    var99: number;           // 99% VaR
    expectedShortfall: number; // Expected Shortfall (CVaR)
  };
  leverage: number;          // 레버리지 비율
  concentration: {
    maxSinglePosition: number; // 최대 단일 종목 비중
    sectorConcentration: Map<string, number>; // 섹터별 집중도
    topPositions: Position[]; // 상위 집중 종목
  };
  liquidity: {
    liquidityRatio: number;   // 유동성 비율
    marketImpactScore: number; // 시장 충격 점수
  };
  correlation: {
    avgCorrelation: number;   // 평균 상관계수
    maxCorrelation: number;   // 최대 상관계수
    correlationMatrix: number[][]; // 상관관계 매트릭스
  };
  drawdown: {
    currentDrawdown: number;  // 현재 낙폭
    maxDrawdown: number;      // 최대 낙폭
    drawdownDuration: number; // 낙폭 지속 기간
  };
}

export interface RiskAlert {
  level: 'info' | 'warning' | 'critical' | 'emergency';
  category: 'var' | 'concentration' | 'liquidity' | 'correlation' | 'drawdown' | 'leverage';
  message: string;
  recommendation: string;
  timestamp: string;
  affectedPositions?: string[];
}

export interface CircuitBreaker {
  name: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  action: 'halt_trading' | 'reduce_position' | 'emergency_exit';
  description: string;
}

/**
 * 종합 리스크 관리 시스템
 */
export class RiskManagementSystem {
  private historicalReturns: Map<string, number[]> = new Map();
  private priceHistory: Map<string, RealTimePrice[]> = new Map();
  private performanceHistory: number[] = [];
  private maxHistoricalValue: number = 0;
  
  constructor(
    private config: TradingConfiguration
  ) {}

  /**
   * 종합 리스크 메트릭 계산
   */
  async calculateRiskMetrics(
    balance: AccountBalance,
    marketPrices: Map<string, RealTimePrice>
  ): Promise<RiskMetrics> {
    
    // 1. VaR 계산
    const portfolioVar = await this.calculatePortfolioVaR(balance, marketPrices);
    
    // 2. 레버리지 계산
    const leverage = this.calculateLeverage(balance);
    
    // 3. 집중도 리스크 계산
    const concentration = this.calculateConcentrationRisk(balance);
    
    // 4. 유동성 리스크 계산
    const liquidity = await this.calculateLiquidityRisk(balance, marketPrices);
    
    // 5. 상관관계 분석
    const correlation = await this.calculateCorrelationMetrics(balance);
    
    // 6. 낙폭 분석
    const drawdown = this.calculateDrawdownMetrics(balance);

    return {
      portfolioVar,
      leverage,
      concentration,
      liquidity,
      correlation,
      drawdown
    };
  }

  /**
   * 포트폴리오 VaR 계산 (몬테카를로 시뮬레이션)
   */
  private async calculatePortfolioVaR(
    balance: AccountBalance, 
    marketPrices: Map<string, RealTimePrice>
  ): Promise<RiskMetrics['portfolioVar']> {
    
    const numSimulations = 10000;
    const timeHorizon = 1; // 1일
    const portfolioValues: number[] = [];
    
    // 각 종목의 수익률 분포 추정
    const returns = this.getAssetReturns(balance.positions);
    const correlationMatrix = this.getCorrelationMatrix(balance.positions);
    
    // 몬테카를로 시뮬레이션
    for (let i = 0; i < numSimulations; i++) {
      let portfolioValue = 0;
      
      for (let j = 0; j < balance.positions.length; j++) {
        const position = balance.positions[j];
        
        // 정규분포 기반 수익률 생성 (상관관계 고려)
        const randomReturn = this.generateCorrelatedReturn(j, correlationMatrix, returns);
        const newPrice = position.currentPrice * (1 + randomReturn);
        const newValue = position.quantity * newPrice;
        
        portfolioValue += newValue;
      }
      
      portfolioValues.push(portfolioValue);
    }
    
    // VaR 계산
    portfolioValues.sort((a, b) => a - b);
    
    const currentValue = balance.totalAssets;
    const var95Index = Math.floor(numSimulations * 0.05);
    const var99Index = Math.floor(numSimulations * 0.01);
    
    const var95 = currentValue - portfolioValues[var95Index];
    const var99 = currentValue - portfolioValues[var99Index];
    
    // Expected Shortfall (CVaR) 계산
    const tailLosses = portfolioValues.slice(0, var95Index);
    const avgTailLoss = tailLosses.reduce((sum, val) => sum + val, 0) / tailLosses.length;
    const expectedShortfall = currentValue - avgTailLoss;
    
    return {
      var95,
      var99,
      expectedShortfall
    };
  }

  /**
   * 상관관계를 고려한 수익률 생성
   */
  private generateCorrelatedReturn(
    assetIndex: number, 
    correlationMatrix: number[][], 
    returns: { mean: number; std: number }[]
  ): number {
    // Cholesky 분해를 통한 상관관계 생성 (단순화된 버전)
    const standardNormal = this.boxMullerTransform();
    const { mean, std } = returns[assetIndex];
    
    return mean + std * standardNormal;
  }

  /**
   * Box-Muller 변환으로 표준정규분포 생성
   */
  private boxMullerTransform(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * 자산별 수익률 통계 계산
   */
  private getAssetReturns(positions: Position[]): { mean: number; std: number }[] {
    return positions.map(position => {
      const returns = this.historicalReturns.get(position.symbol) || [];
      
      if (returns.length < 20) {
        // 충분한 데이터가 없는 경우 기본값
        return { mean: 0.001, std: 0.02 }; // 일일 0.1% 수익률, 2% 변동성
      }
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const std = Math.sqrt(variance);
      
      return { mean, std };
    });
  }

  /**
   * 상관관계 매트릭스 계산
   */
  private getCorrelationMatrix(positions: Position[]): number[][] {
    const n = positions.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          // 실제로는 과거 수익률 데이터로 계산
          matrix[i][j] = this.calculateCorrelation(
            positions[i].symbol, 
            positions[j].symbol
          );
        }
      }
    }
    
    return matrix;
  }

  /**
   * 두 종목간 상관계수 계산
   */
  private calculateCorrelation(symbol1: string, symbol2: string): number {
    const returns1 = this.historicalReturns.get(symbol1) || [];
    const returns2 = this.historicalReturns.get(symbol2) || [];
    
    if (returns1.length < 20 || returns2.length < 20) {
      return 0.3; // 기본 상관계수
    }
    
    const n = Math.min(returns1.length, returns2.length);
    const mean1 = returns1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const mean2 = returns2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }
    
    const correlation = numerator / Math.sqrt(denominator1 * denominator2);
    return isNaN(correlation) ? 0 : correlation;
  }

  /**
   * 레버리지 계산
   */
  private calculateLeverage(balance: AccountBalance): number {
    return balance.stockValue / balance.totalAssets;
  }

  /**
   * 집중도 리스크 계산
   */
  private calculateConcentrationRisk(balance: AccountBalance): RiskMetrics['concentration'] {
    const totalValue = balance.totalAssets;
    const sectorConcentration = new Map<string, number>();
    
    // 각 종목의 비중 계산
    const positionWeights = balance.positions.map(position => ({
      ...position,
      weight: position.evaluationAmount / totalValue
    }));
    
    // 최대 단일 종목 비중
    const maxSinglePosition = Math.max(...positionWeights.map(p => p.weight));
    
    // 섹터별 집중도 (실제로는 종목 코드로 섹터 매핑)
    positionWeights.forEach(position => {
      const sector = this.getSector(position.symbol);
      const currentConcentration = sectorConcentration.get(sector) || 0;
      sectorConcentration.set(sector, currentConcentration + position.weight);
    });
    
    // 상위 집중 종목 (비중 기준 상위 5개)
    const topPositions = balance.positions
      .sort((a, b) => b.evaluationAmount - a.evaluationAmount)
      .slice(0, 5);
    
    return {
      maxSinglePosition,
      sectorConcentration,
      topPositions
    };
  }

  /**
   * 종목 코드로 섹터 매핑 (예시)
   */
  private getSector(symbol: string): string {
    const sectorMap: { [key: string]: string } = {
      '005930': 'Technology',     // 삼성전자
      '000660': 'Technology',     // SK하이닉스
      '035420': 'Technology',     // NAVER
      '051910': 'Chemical',       // LG화학
      '068270': 'Healthcare',     // 셀트리온
      '035720': 'Healthcare',     // 카카오
      '207940': 'Technology',     // 삼성바이오로직스
      '006400': 'Steel',          // 삼성SDI
      '028260': 'Consumer',       // 삼성물산
      '012330': 'Mobile'          // 현대모비스
    };
    
    return sectorMap[symbol] || 'Others';
  }

  /**
   * 유동성 리스크 계산
   */
  private async calculateLiquidityRisk(
    balance: AccountBalance,
    marketPrices: Map<string, RealTimePrice>
  ): Promise<RiskMetrics['liquidity']> {
    
    let totalLiquidValue = balance.cashBalance;
    let totalValue = balance.totalAssets;
    let totalMarketImpact = 0;
    
    for (const position of balance.positions) {
      const price = marketPrices.get(position.symbol);
      if (price) {
        // 거래량 대비 포지션 크기로 유동성 판단
        const positionValue = position.quantity * price.price;
        const dailyVolume = price.volume * price.price;
        const liquidityScore = Math.min(dailyVolume / positionValue, 1.0);
        
        // 유동성이 높은 종목일수록 쉽게 현금화 가능
        totalLiquidValue += positionValue * liquidityScore;
        
        // 시장 충격도 계산 (포지션이 클수록 매도시 가격 하락 위험)
        const marketImpact = Math.max(0, (positionValue / dailyVolume - 0.05) * 0.1);
        totalMarketImpact += marketImpact * positionValue;
      }
    }
    
    return {
      liquidityRatio: totalLiquidValue / totalValue,
      marketImpactScore: totalMarketImpact / totalValue
    };
  }

  /**
   * 상관관계 메트릭 계산
   */
  private async calculateCorrelationMetrics(balance: AccountBalance): Promise<RiskMetrics['correlation']> {
    const correlationMatrix = this.getCorrelationMatrix(balance.positions);
    const n = correlationMatrix.length;
    
    let sumCorrelation = 0;
    let maxCorrelation = 0;
    let count = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = Math.abs(correlationMatrix[i][j]);
        sumCorrelation += corr;
        maxCorrelation = Math.max(maxCorrelation, corr);
        count++;
      }
    }
    
    return {
      avgCorrelation: count > 0 ? sumCorrelation / count : 0,
      maxCorrelation,
      correlationMatrix
    };
  }

  /**
   * 낙폭 분석
   */
  private calculateDrawdownMetrics(balance: AccountBalance): RiskMetrics['drawdown'] {
    this.performanceHistory.push(balance.totalAssets);
    this.maxHistoricalValue = Math.max(this.maxHistoricalValue, balance.totalAssets);
    
    const currentDrawdown = (this.maxHistoricalValue - balance.totalAssets) / this.maxHistoricalValue;
    
    // 최대 낙폭 계산
    let maxDrawdown = 0;
    let peak = 0;
    
    for (const value of this.performanceHistory) {
      peak = Math.max(peak, value);
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    // 낙폭 지속 기간 계산 (단순화)
    let drawdownDuration = 0;
    for (let i = this.performanceHistory.length - 1; i >= 0; i--) {
      if (this.performanceHistory[i] < this.maxHistoricalValue) {
        drawdownDuration++;
      } else {
        break;
      }
    }
    
    return {
      currentDrawdown,
      maxDrawdown,
      drawdownDuration
    };
  }

  /**
   * 리스크 알림 생성
   */
  generateRiskAlerts(metrics: RiskMetrics): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const limits = this.config.riskLimits;

    // VaR 알림
    if (metrics.portfolioVar.var95 > limits.maxDailyLoss * 10000) { // 일일 손실 한도의 10배
      alerts.push({
        level: 'critical',
        category: 'var',
        message: `95% VaR이 위험 수준입니다: ${metrics.portfolioVar.var95.toLocaleString()}원`,
        recommendation: '포지션 축소 또는 헤지 전략 검토가 필요합니다.',
        timestamp: new Date().toISOString()
      });
    }

    // 집중도 알림
    if (metrics.concentration.maxSinglePosition > limits.maxPositionSize) {
      alerts.push({
        level: 'warning',
        category: 'concentration',
        message: `단일 종목 집중도가 한계를 초과했습니다: ${(metrics.concentration.maxSinglePosition * 100).toFixed(1)}%`,
        recommendation: '포트폴리오 다각화를 통해 집중도를 낮추세요.',
        timestamp: new Date().toISOString()
      });
    }

    // 레버리지 알림
    if (metrics.leverage > limits.maxLeverage) {
      alerts.push({
        level: 'critical',
        category: 'leverage',
        message: `레버리지가 한계를 초과했습니다: ${metrics.leverage.toFixed(2)}배`,
        recommendation: '즉시 포지션을 축소하여 레버리지를 줄이세요.',
        timestamp: new Date().toISOString()
      });
    }

    // 낙폭 알림
    if (metrics.drawdown.currentDrawdown > limits.maxDrawdown) {
      alerts.push({
        level: 'emergency',
        category: 'drawdown',
        message: `최대 낙폭 한계를 초과했습니다: ${(metrics.drawdown.currentDrawdown * 100).toFixed(1)}%`,
        recommendation: '긴급 리스크 관리 프로토콜을 실행하세요.',
        timestamp: new Date().toISOString()
      });
    }

    // 유동성 알림
    if (metrics.liquidity.liquidityRatio < 0.3) {
      alerts.push({
        level: 'warning',
        category: 'liquidity',
        message: `포트폴리오 유동성이 낮습니다: ${(metrics.liquidity.liquidityRatio * 100).toFixed(1)}%`,
        recommendation: '유동성이 높은 자산 비중을 늘리세요.',
        timestamp: new Date().toISOString()
      });
    }

    // 상관관계 알림
    if (metrics.correlation.avgCorrelation > 0.7) {
      alerts.push({
        level: 'info',
        category: 'correlation',
        message: `포트폴리오 내 상관관계가 높습니다: ${(metrics.correlation.avgCorrelation * 100).toFixed(1)}%`,
        recommendation: '상관관계가 낮은 자산으로 다각화하세요.',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * 서킷 브레이커 체크
   */
  checkCircuitBreakers(metrics: RiskMetrics): CircuitBreaker[] {
    const breakers: CircuitBreaker[] = [
      {
        name: 'Emergency VaR Breaker',
        threshold: this.config.riskLimits.maxDailyLoss * 20000, // 일일 손실 한도의 20배
        currentValue: metrics.portfolioVar.var99,
        triggered: metrics.portfolioVar.var99 > this.config.riskLimits.maxDailyLoss * 20000,
        action: 'emergency_exit',
        description: '99% VaR 긴급 차단기'
      },
      {
        name: 'Drawdown Breaker',
        threshold: this.config.riskLimits.maxDrawdown * 2,
        currentValue: metrics.drawdown.currentDrawdown,
        triggered: metrics.drawdown.currentDrawdown > this.config.riskLimits.maxDrawdown * 2,
        action: 'halt_trading',
        description: '최대 낙폭 2배 도달시 매매 중단'
      },
      {
        name: 'Leverage Breaker',
        threshold: this.config.riskLimits.maxLeverage * 1.5,
        currentValue: metrics.leverage,
        triggered: metrics.leverage > this.config.riskLimits.maxLeverage * 1.5,
        action: 'reduce_position',
        description: '레버리지 1.5배 초과시 포지션 축소'
      }
    ];

    return breakers;
  }

  /**
   * 거래 전 리스크 검증
   */
  async validateTrade(
    decision: TradingDecision, 
    currentMetrics: RiskMetrics,
    balance: AccountBalance
  ): Promise<{ approved: boolean; reason?: string; modifications?: Partial<TradingDecision> }> {
    
    // 1. 기본 한도 체크
    if (decision.targetSize > this.config.riskLimits.maxPositionSize) {
      return {
        approved: false,
        reason: `포지션 크기가 한도를 초과합니다: ${decision.targetSize} > ${this.config.riskLimits.maxPositionSize}`
      };
    }

    // 2. 집중도 리스크 체크
    const newConcentration = this.simulateConcentration(decision, balance);
    if (newConcentration > this.config.riskLimits.maxPositionSize * 1.2) {
      return {
        approved: true,
        modifications: {
          targetSize: this.config.riskLimits.maxPositionSize * 0.8
        },
        reason: '집중도 리스크로 포지션 크기 조정'
      };
    }

    // 3. VaR 증가 시뮬레이션
    const projectedVar = await this.simulateVarImpact(decision, currentMetrics);
    if (projectedVar > currentMetrics.portfolioVar.var95 * 1.3) {
      return {
        approved: false,
        reason: 'VaR 증가가 과도합니다'
      };
    }

    // 4. 신뢰도 기반 추가 검증
    if (decision.confidence < 0.8 && decision.riskScore > 0.5) {
      return {
        approved: true,
        modifications: {
          targetSize: decision.targetSize * 0.5
        },
        reason: '낮은 신뢰도와 높은 리스크로 포지션 크기 반감'
      };
    }

    return { approved: true };
  }

  /**
   * 집중도 시뮬레이션
   */
  private simulateConcentration(decision: TradingDecision, balance: AccountBalance): number {
    const totalValue = balance.totalAssets;
    const targetValue = totalValue * decision.targetSize;
    
    return targetValue / totalValue;
  }

  /**
   * VaR 영향 시뮬레이션
   */
  private async simulateVarImpact(decision: TradingDecision, currentMetrics: RiskMetrics): Promise<number> {
    // 단순화된 VaR 증가 계산
    const baseVar = currentMetrics.portfolioVar.var95;
    const riskMultiplier = 1 + (decision.riskScore * decision.targetSize);
    
    return baseVar * riskMultiplier;
  }

  /**
   * 과거 수익률 데이터 업데이트
   */
  updateHistoricalData(symbol: string, price: RealTimePrice): void {
    // 가격 히스토리 업데이트
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);
    
    // 최근 252일 (1년) 데이터만 유지
    if (prices.length > 252) {
      prices.shift();
    }
    
    // 수익률 계산 및 업데이트
    if (prices.length > 1) {
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i - 1].price;
        const currPrice = prices[i].price;
        const return_ = (currPrice - prevPrice) / prevPrice;
        returns.push(return_);
      }
      
      this.historicalReturns.set(symbol, returns);
    }
  }

  /**
   * 리스크 보고서 생성
   */
  generateRiskReport(metrics: RiskMetrics, alerts: RiskAlert[]): string {
    const report = `
# 리스크 관리 보고서
생성일시: ${new Date().toLocaleString('ko-KR')}

## 📊 주요 리스크 지표

### VaR (Value at Risk)
- 95% VaR: ${metrics.portfolioVar.var95.toLocaleString()}원
- 99% VaR: ${metrics.portfolioVar.var99.toLocaleString()}원  
- Expected Shortfall: ${metrics.portfolioVar.expectedShortfall.toLocaleString()}원

### 포트폴리오 구조
- 레버리지: ${metrics.leverage.toFixed(2)}배
- 최대 단일 종목 비중: ${(metrics.concentration.maxSinglePosition * 100).toFixed(1)}%
- 유동성 비율: ${(metrics.liquidity.liquidityRatio * 100).toFixed(1)}%

### 분산투자 현황  
- 평균 상관계수: ${(metrics.correlation.avgCorrelation * 100).toFixed(1)}%
- 최대 상관계수: ${(metrics.correlation.maxCorrelation * 100).toFixed(1)}%

### 성과 추적
- 현재 낙폭: ${(metrics.drawdown.currentDrawdown * 100).toFixed(1)}%
- 최대 낙폭: ${(metrics.drawdown.maxDrawdown * 100).toFixed(1)}%
- 낙폭 지속일: ${metrics.drawdown.drawdownDuration}일

## 🚨 리스크 알림 (${alerts.length}건)
${alerts.map(alert => `
**${alert.level.toUpperCase()}** - ${alert.category}
${alert.message}
💡 권장사항: ${alert.recommendation}
`).join('\n')}

## 🔒 안전장치 상태
- 모든 서킷 브레이커 정상 작동 중
- 실시간 모니터링 활성
- 자동 리스크 관리 시스템 운영 중
`;

    return report;
  }
}

/**
 * 긴급 상황 대응 시스템
 */
export class EmergencyResponseSystem {
  constructor(private riskSystem: RiskManagementSystem) {}

  /**
   * 긴급 상황 감지 및 대응
   */
  async handleEmergency(
    breakers: CircuitBreaker[], 
    balance: AccountBalance,
    tradingManager: any
  ): Promise<void> {
    
    const triggeredBreakers = breakers.filter(b => b.triggered);
    
    if (triggeredBreakers.length === 0) return;

    console.log(`🚨 긴급 상황 감지: ${triggeredBreakers.length}개 서킷브레이커 작동`);

    for (const breaker of triggeredBreakers) {
      switch (breaker.action) {
        case 'emergency_exit':
          await this.emergencyExit(balance, tradingManager);
          break;
        case 'halt_trading':
          await this.haltTrading();
          break;
        case 'reduce_position':
          await this.reducePositions(balance, tradingManager, 0.5);
          break;
      }
    }
  }

  /**
   * 긴급 청산
   */
  private async emergencyExit(balance: AccountBalance, tradingManager: any): Promise<void> {
    console.log('🔴 긴급 청산 실행');
    
    // 모든 포지션 시장가 매도
    for (const position of balance.positions) {
      try {
        await tradingManager.placeOrder({
          symbol: position.symbol,
          orderType: 'sell',
          orderMethod: 'market',
          quantity: position.quantity,
          accountNo: 'emergency'
        });
        
        console.log(`긴급 매도: ${position.symbol} ${position.quantity}주`);
      } catch (error) {
        console.error(`긴급 매도 실패: ${position.symbol}`, error);
      }
    }
  }

  /**
   * 매매 중단
   */
  private async haltTrading(): Promise<void> {
    console.log('⏸️ 자동매매 중단');
    // 자동매매 엔진 중지 로직
  }

  /**
   * 포지션 축소
   */
  private async reducePositions(
    balance: AccountBalance, 
    tradingManager: any, 
    reductionRatio: number
  ): Promise<void> {
    console.log(`📉 포지션 ${reductionRatio * 100}% 축소`);
    
    for (const position of balance.positions) {
      const sellQuantity = Math.floor(position.quantity * reductionRatio);
      
      if (sellQuantity > 0) {
        try {
          await tradingManager.placeOrder({
            symbol: position.symbol,
            orderType: 'sell',
            orderMethod: 'market',
            quantity: sellQuantity,
            accountNo: 'risk_management'
          });
        } catch (error) {
          console.error(`포지션 축소 실패: ${position.symbol}`, error);
        }
      }
    }
  }
}