// Market Data Types for Real-time Integration

export interface RealTimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface TechnicalIndicators {
  symbol: string;
  sma5: number;
  sma20: number;
  sma50: number;
  rsi14: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  timestamp: string;
}

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  relatedSymbols: string[];
}

export interface EconomicIndicator {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  releaseDate: string;
  nextReleaseDate: string;
  frequency: string;
}

export interface MarketSector {
  sector: string;
  performance: number;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  topStocks: string[];
}

export interface PortfolioRealTime extends RealTimeQuote {
  quantity: number;
  totalValue: number;
  weight: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

// API Response Types
export interface AlphaVantageResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Time Zone': string;
  };
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
  };
}

// Korean Market Specific Types
export interface KRXStock {
  itemcode: string;        // 종목코드
  itemname: string;        // 종목명
  nowprice: number;        // 현재가
  change: string;          // 등락구분
  changePrice: number;     // 변동가격
  changeRate: number;      // 등락률
  volume: number;          // 거래량
  marketcap: number;       // 시가총액
  per: number;             // PER
  pbr: number;             // PBR
  eps: number;             // EPS
  bps: number;             // BPS
  dividendYield: number;   // 배당수익률
  sector: string;          // 업종
}

export interface NaverFinanceResponse {
  resultCode: string;
  message: string;
  result: {
    areas: Array<{
      datas: Array<{
        cd: string;          // 종목코드
        nm: string;          // 종목명
        nv: string;          // 현재가
        cr: string;          // 등락률
        cv: string;          // 변동가
        pcv: string;         // 전일종가
        sv: string;          // 거래량
        ms: string;          // 시가총액
      }>;
    }>;
  };
}

// ML Model Input Types
export interface FeatureVector {
  prices: number[];        // 최근 N일 가격 데이터
  technicals: number[];    // 기술적 지표
  volume: number[];        // 거래량 패턴
  sentiment: number;       // 뉴스 센티멘트 스코어
  macroeconomic: number[]; // 거시경제 지표
  timestamp: string;
}

export interface MLPrediction {
  symbol: string;
  prediction: number;      // 예측 수익률
  confidence: number;      // 신뢰도 (0-1)
  action: 'buy' | 'sell' | 'hold';
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number;     // 예측 기간 (일)
  features: FeatureVector;
  modelVersion: string;
  timestamp: string;
}