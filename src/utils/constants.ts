// Constants for the AI Investment System

export const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'AMZN'];
export const KOREAN_SYMBOLS = ['005930.KS', '000660.KS', '035420.KS']; // Samsung, SK Hynix, Naver

export const API_ENDPOINTS = {
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
  YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart',
  POLYGON: 'https://api.polygon.io/v2/aggs/ticker',
  NAVER_FINANCE: 'https://polling.finance.naver.com/api/realtime',
  NEWS_API: 'https://newsapi.org/v2/everything'
};

export const CACHE_DURATIONS = {
  REAL_TIME_QUOTES: 30000,    // 30 seconds
  HISTORICAL_DATA: 3600000,   // 1 hour
  TECHNICAL_INDICATORS: 300000, // 5 minutes
  NEWS_DATA: 600000,          // 10 minutes
  MARKET_ANALYSIS: 300000,    // 5 minutes
  BACKTEST_RESULTS: 3600000,  // 1 hour
  RISK_METRICS: 600000        // 10 minutes
};

export const RISK_THRESHOLDS = {
  HIGH_VOLATILITY: 5,         // 5% daily change
  LOW_CONFIDENCE: 0.3,        // 30% AI confidence
  MAX_DRAWDOWN_WARNING: 10    // 10% drawdown warning
};

export const ML_PARAMS = {
  FEATURE_SIZE: 50,
  ACTION_SIZE: 6,
  LEARNING_RATE: 0.0003,
  GAMMA: 0.99,
  EPSILON: 0.2,
  CLIP_RATIO: 0.2
};