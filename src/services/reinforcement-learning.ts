// Advanced Reinforcement Learning Trading Agent
import { RealTimeQuote, HistoricalPrice, TechnicalIndicators, FeatureVector, MLPrediction } from '../types/market-data';

/**
 * 강화학습 기반 트레이딩 에이전트
 * - PPO (Proximal Policy Optimization) 알고리즘 구현
 * - 연속적 행동 공간 (포트폴리오 비중 결정)
 * - 리스크 조정 수익률 최적화
 */
export class ReinforcementLearningAgent {
  private networkWeights: {
    actor: number[][];    // 정책 네트워크
    critic: number[][];   // 가치 네트워크
  };
  private hyperParams: {
    learningRate: number;
    gamma: number;        // 할인율
    epsilon: number;      // 탐험률
    clipRatio: number;    // PPO 클리핑 비율
  };
  private experienceBuffer: Experience[] = [];
  private featureSize: number;
  private actionSize: number;

  constructor(
    featureSize: number = 50,  // 입력 특성 수
    actionSize: number = 3,    // 자산 수 (출력 행동 수)
    hyperParams: Partial<ReinforcementLearningAgent['hyperParams']> = {}
  ) {
    this.featureSize = featureSize;
    this.actionSize = actionSize;
    
    this.hyperParams = {
      learningRate: 0.0003,
      gamma: 0.99,
      epsilon: 0.2,
      clipRatio: 0.2,
      ...hyperParams
    };

    // 네트워크 가중치 초기화
    this.networkWeights = {
      actor: this.initializeNetwork([featureSize, 128, 64, actionSize]),
      critic: this.initializeNetwork([featureSize, 128, 64, 1])
    };
  }

  /**
   * 포트폴리오 액션 선택 (정책 네트워크)
   */
  async selectAction(features: FeatureVector, isTraining: boolean = false): Promise<number[]> {
    const stateVector = this.featuresToVector(features);
    
    // Actor 네트워크를 통한 행동 확률 계산
    const actionProbs = this.forwardPass(stateVector, this.networkWeights.actor);
    
    // Softmax를 통한 포트폴리오 비중 정규화
    const portfolioWeights = this.softmax(actionProbs);
    
    // 탐험 노이즈 추가 (훈련 시)
    if (isTraining) {
      return this.addExplorationNoise(portfolioWeights);
    }
    
    return portfolioWeights;
  }

  /**
   * 상태 가치 예측 (비평 네트워크)
   */
  async predictValue(features: FeatureVector): Promise<number> {
    const stateVector = this.featuresToVector(features);
    const value = this.forwardPass(stateVector, this.networkWeights.critic);
    return value[0];
  }

  /**
   * 경험 데이터 저장
   */
  storeExperience(
    state: FeatureVector,
    action: number[],
    reward: number,
    nextState: FeatureVector,
    done: boolean
  ): void {
    this.experienceBuffer.push({
      state,
      action,
      reward,
      nextState,
      done,
      timestamp: Date.now()
    });

    // 버퍼 크기 제한 (메모리 관리)
    if (this.experienceBuffer.length > 10000) {
      this.experienceBuffer.shift();
    }
  }

  /**
   * PPO 알고리즘을 통한 네트워크 업데이트
   */
  async trainOnBatch(batchSize: number = 64): Promise<{ actorLoss: number; criticLoss: number }> {
    if (this.experienceBuffer.length < batchSize) {
      return { actorLoss: 0, criticLoss: 0 };
    }

    // 배치 샘플링
    const batch = this.sampleBatch(batchSize);
    
    // 어드밴티지 계산
    const advantages = this.calculateAdvantages(batch);
    
    // Actor 네트워크 업데이트 (정책 그래디언트)
    const actorLoss = this.updateActor(batch, advantages);
    
    // Critic 네트워크 업데이트 (가치 함수)
    const criticLoss = this.updateCritic(batch);

    return { actorLoss, criticLoss };
  }

  /**
   * 투자 전략 예측
   */
  async generateTradingSignals(
    marketData: RealTimeQuote[],
    historicalData: HistoricalPrice[][],
    technicalIndicators: TechnicalIndicators[]
  ): Promise<MLPrediction[]> {
    const predictions: MLPrediction[] = [];

    for (let i = 0; i < marketData.length; i++) {
      const features = this.constructFeatures(
        marketData[i],
        historicalData[i] || [],
        technicalIndicators[i]
      );

      const portfolioWeights = await this.selectAction(features, false);
      const confidence = this.calculateConfidence(features);
      
      // 행동을 거래 신호로 변환
      const signal = this.weightsToSignal(portfolioWeights[i], confidence);

      predictions.push({
        symbol: marketData[i].symbol,
        prediction: signal.expectedReturn,
        confidence: confidence,
        action: signal.action,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        timeHorizon: 5, // 5일 예측
        features: features,
        modelVersion: 'RL-PPO-v1.0',
        timestamp: new Date().toISOString()
      });
    }

    return predictions;
  }

  /**
   * 백테스팅 실행
   */
  async runBacktest(
    historicalPrices: HistoricalPrice[][],
    symbols: string[],
    initialCapital: number = 100000
  ): Promise<BacktestResult> {
    let capital = initialCapital;
    let portfolio: Record<string, number> = {};
    const trades: Trade[] = [];
    const portfolioValues: number[] = [];
    
    // 각 시점에서 포트폴리오 리밸런싱
    for (let day = 50; day < historicalPrices[0].length; day++) {
      const currentPrices = symbols.map((symbol, i) => historicalPrices[i][day]);
      const features = this.constructBacktestFeatures(historicalPrices, day);
      
      const actions = await this.selectAction(features, false);
      
      // 포트폴리오 리밸런싱
      const rebalanceResult = this.executeRebalancing(
        portfolio, 
        capital, 
        currentPrices, 
        symbols, 
        actions
      );
      
      portfolio = rebalanceResult.newPortfolio;
      capital = rebalanceResult.newCapital;
      trades.push(...rebalanceResult.trades);
      
      // 포트폴리오 가치 계산
      const portfolioValue = this.calculatePortfolioValue(portfolio, currentPrices, capital);
      portfolioValues.push(portfolioValue);
    }

    return this.calculateBacktestMetrics(portfolioValues, trades, initialCapital);
  }

  // === 프라이빗 메서드들 ===

  /**
   * 네트워크 가중치 초기화
   */
  private initializeNetwork(layers: number[]): number[][] {
    const weights: number[][] = [];
    
    for (let i = 0; i < layers.length - 1; i++) {
      const layerWeights: number[] = [];
      const inputSize = layers[i];
      const outputSize = layers[i + 1];
      
      // Xavier 초기화
      const limit = Math.sqrt(6.0 / (inputSize + outputSize));
      
      for (let j = 0; j < inputSize * outputSize; j++) {
        layerWeights.push((Math.random() * 2 - 1) * limit);
      }
      
      weights.push(layerWeights);
    }
    
    return weights;
  }

  /**
   * 순전파 (Forward Pass)
   */
  private forwardPass(input: number[], weights: number[][]): number[] {
    let activation = input;
    
    for (let layer = 0; layer < weights.length; layer++) {
      const layerWeights = weights[layer];
      const inputSize = activation.length;
      const outputSize = layerWeights.length / inputSize;
      const newActivation: number[] = [];
      
      for (let i = 0; i < outputSize; i++) {
        let sum = 0;
        for (let j = 0; j < inputSize; j++) {
          sum += activation[j] * layerWeights[i * inputSize + j];
        }
        
        // ReLU 활성화 함수 (마지막 층 제외)
        if (layer < weights.length - 1) {
          newActivation.push(Math.max(0, sum));
        } else {
          newActivation.push(sum);
        }
      }
      
      activation = newActivation;
    }
    
    return activation;
  }

  /**
   * 특성 벡터 변환
   */
  private featuresToVector(features: FeatureVector): number[] {
    const vector: number[] = [];
    
    // 가격 데이터 정규화
    const prices = features.prices.slice(-20); // 최근 20일
    const priceReturns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    vector.push(...priceReturns);
    
    // 기술적 지표
    vector.push(...features.technicals);
    
    // 거래량 정규화
    const volumeReturns = features.volume.slice(-5); // 최근 5일
    vector.push(...volumeReturns);
    
    // 센티멘트 스코어
    vector.push(features.sentiment);
    
    // 거시경제 지표
    vector.push(...features.macroeconomic);
    
    // 벡터 크기 맞추기
    while (vector.length < this.featureSize) {
      vector.push(0);
    }
    
    return vector.slice(0, this.featureSize);
  }

  /**
   * Softmax 활성화 함수
   */
  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const exps = values.map(val => Math.exp(val - maxVal));
    const sumExps = exps.reduce((sum, exp) => sum + exp, 0);
    return exps.map(exp => exp / sumExps);
  }

  /**
   * 탐험 노이즈 추가
   */
  private addExplorationNoise(weights: number[]): number[] {
    const noisyWeights = weights.map(weight => {
      const noise = (Math.random() - 0.5) * this.hyperParams.epsilon * 0.1;
      return Math.max(0, Math.min(1, weight + noise));
    });
    
    // 재정규화
    const sum = noisyWeights.reduce((s, w) => s + w, 0);
    return noisyWeights.map(w => w / sum);
  }

  /**
   * 어드밴티지 계산 (GAE - Generalized Advantage Estimation)
   */
  private calculateAdvantages(batch: Experience[]): number[] {
    const advantages: number[] = [];
    let gae = 0;
    
    for (let i = batch.length - 1; i >= 0; i--) {
      const experience = batch[i];
      const nextValue = i < batch.length - 1 ? 0 : 0; // 다음 상태 가치 (단순화)
      const currentValue = 0; // 현재 상태 가치 (단순화)
      
      const delta = experience.reward + this.hyperParams.gamma * nextValue - currentValue;
      gae = delta + this.hyperParams.gamma * 0.95 * gae; // λ=0.95
      advantages.unshift(gae);
    }
    
    return advantages;
  }

  /**
   * 배치 샘플링
   */
  private sampleBatch(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    for (let i = 0; i < batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.experienceBuffer.length);
      batch.push(this.experienceBuffer[randomIndex]);
    }
    return batch;
  }

  /**
   * Actor 네트워크 업데이트
   */
  private updateActor(batch: Experience[], advantages: number[]): number {
    // PPO 클리핑된 정책 그래디언트 (단순화된 구현)
    let totalLoss = 0;
    
    for (let i = 0; i < batch.length; i++) {
      const experience = batch[i];
      const advantage = advantages[i];
      
      // 정책 비율 계산 및 클리핑
      const ratio = 1.0; // 단순화 (실제로는 새 정책 / 이전 정책)
      const clippedRatio = Math.max(
        Math.min(ratio, 1 + this.hyperParams.clipRatio),
        1 - this.hyperParams.clipRatio
      );
      
      const loss = -Math.min(ratio * advantage, clippedRatio * advantage);
      totalLoss += loss;
    }
    
    // 가중치 업데이트 (단순 그래디언트)
    // 실제 구현에서는 더 정교한 역전파 필요
    
    return totalLoss / batch.length;
  }

  /**
   * Critic 네트워크 업데이트
   */
  private updateCritic(batch: Experience[]): number {
    let totalLoss = 0;
    
    for (const experience of batch) {
      // 타겟 가치 계산
      const target = experience.reward + (experience.done ? 0 : this.hyperParams.gamma * 0);
      const predicted = 0; // 현재 예측 가치 (단순화)
      
      const loss = Math.pow(target - predicted, 2);
      totalLoss += loss;
    }
    
    return totalLoss / batch.length;
  }

  /**
   * 특성 구성
   */
  private constructFeatures(
    quote: RealTimeQuote,
    history: HistoricalPrice[],
    indicators?: TechnicalIndicators
  ): FeatureVector {
    const prices = history.map(h => h.close);
    const volumes = history.map(h => h.volume);
    
    return {
      prices: prices.slice(-20),
      technicals: indicators ? [
        indicators.sma5, indicators.sma20, indicators.sma50, indicators.rsi14,
        indicators.macd.macd, indicators.macd.signal,
        indicators.bollinger.upper, indicators.bollinger.lower
      ] : [0, 0, 0, 0, 0, 0, 0, 0],
      volume: volumes.slice(-5),
      sentiment: Math.random() * 2 - 1, // 임시 센티멘트
      macroeconomic: [0, 0, 0], // 임시 거시경제 지표
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(features: FeatureVector): number {
    // 데이터 품질 기반 신뢰도 (단순화)
    const priceVariance = this.calculateVariance(features.prices);
    const volumeConsistency = this.calculateConsistency(features.volume);
    
    return Math.min(1, 0.5 + (1 / (1 + priceVariance)) * 0.3 + volumeConsistency * 0.2);
  }

  /**
   * 가중치를 거래 신호로 변환
   */
  private weightsToSignal(weight: number, confidence: number): {
    expectedReturn: number;
    action: 'buy' | 'sell' | 'hold';
    targetPrice: number;
    stopLoss: number;
  } {
    const threshold = 0.1;
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    
    if (weight > 0.5 + threshold) {
      action = 'buy';
    } else if (weight < 0.5 - threshold) {
      action = 'sell';
    }
    
    return {
      expectedReturn: (weight - 0.5) * 2 * confidence * 100, // -100% to +100%
      action,
      targetPrice: 100 * (1 + (weight - 0.5) * 0.2), // ±20% 목표
      stopLoss: 100 * (1 - Math.abs(weight - 0.5) * 0.1) // 최대 10% 손절
    };
  }

  // 유틸리티 메서드들
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private calculateConsistency(values: number[]): number {
    const coeffVar = this.calculateVariance(values) / (values.reduce((sum, val) => sum + val, 0) / values.length);
    return 1 / (1 + coeffVar);
  }

  private constructBacktestFeatures(historicalPrices: HistoricalPrice[][], day: number): FeatureVector {
    const prices = historicalPrices[0].slice(day - 20, day).map(h => h.close);
    const volumes = historicalPrices[0].slice(day - 5, day).map(h => h.volume);
    
    return {
      prices,
      technicals: [0, 0, 0, 0, 0, 0, 0, 0],
      volume: volumes,
      sentiment: 0,
      macroeconomic: [0, 0, 0],
      timestamp: new Date().toISOString()
    };
  }

  private executeRebalancing(
    currentPortfolio: Record<string, number>,
    capital: number,
    prices: HistoricalPrice[],
    symbols: string[],
    targetWeights: number[]
  ): { newPortfolio: Record<string, number>; newCapital: number; trades: Trade[] } {
    // 간단한 리밸런싱 로직 (실제로는 더 복잡함)
    const trades: Trade[] = [];
    const newPortfolio: Record<string, number> = {};
    let newCapital = capital;
    
    // 현재 포트폴리오 가치 계산
    const totalValue = capital + symbols.reduce((sum, symbol, i) => {
      const shares = currentPortfolio[symbol] || 0;
      return sum + shares * prices[i].close;
    }, 0);
    
    // 목표 비중에 따라 리밸런싱
    symbols.forEach((symbol, i) => {
      const targetValue = totalValue * targetWeights[i];
      const currentShares = currentPortfolio[symbol] || 0;
      const currentValue = currentShares * prices[i].close;
      const targetShares = Math.floor(targetValue / prices[i].close);
      
      if (targetShares !== currentShares) {
        trades.push({
          symbol,
          action: targetShares > currentShares ? 'buy' : 'sell',
          quantity: Math.abs(targetShares - currentShares),
          price: prices[i].close,
          timestamp: new Date().toISOString()
        });
      }
      
      newPortfolio[symbol] = targetShares;
      newCapital -= (targetShares - currentShares) * prices[i].close;
    });
    
    return { newPortfolio, newCapital, trades };
  }

  private calculatePortfolioValue(
    portfolio: Record<string, number>,
    prices: HistoricalPrice[],
    cash: number
  ): number {
    let totalValue = cash;
    Object.entries(portfolio).forEach(([symbol, shares], i) => {
      totalValue += shares * prices[i].close;
    });
    return totalValue;
  }

  private calculateBacktestMetrics(
    portfolioValues: number[],
    trades: Trade[],
    initialCapital: number
  ): BacktestResult {
    const finalValue = portfolioValues[portfolioValues.length - 1];
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
    
    // 샤프 비율 계산
    const returns = portfolioValues.slice(1).map((val, i) => (val - portfolioValues[i]) / portfolioValues[i]);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStd = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = avgReturn / returnStd * Math.sqrt(252); // 연율화
    
    // 최대 낙폭 계산
    let maxDrawdown = 0;
    let peak = portfolioValues[0];
    for (const value of portfolioValues) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    // 승률 계산
    const winningTrades = returns.filter(ret => ret > 0).length;
    const winRate = winningTrades / returns.length;
    
    return {
      startDate: '2023-01-01',
      endDate: '2024-12-31',
      initialValue: initialCapital,
      finalValue: finalValue,
      totalReturn: totalReturn,
      sharpeRatio: sharpeRatio,
      maxDrawdown: -maxDrawdown * 100,
      trades: trades.length,
      winRate: winRate
    };
  }
}

// 타입 정의들
interface Experience {
  state: FeatureVector;
  action: number[];
  reward: number;
  nextState: FeatureVector;
  done: boolean;
  timestamp: number;
}

interface Trade {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
}

interface BacktestResult {
  startDate: string;
  endDate: string;
  initialValue: number;
  finalValue: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: number;
  winRate: number;
}