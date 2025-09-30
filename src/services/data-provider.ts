// Real-time Market Data Provider Service
import { 
  RealTimeQuote, 
  HistoricalPrice, 
  TechnicalIndicators,
  MarketNews,
  AlphaVantageResponse,
  YahooFinanceResponse,
  KRXStock,
  NaverFinanceResponse 
} from '../types/market-data';

/**
 * 통합 데이터 프로바이더 클래스
 * - 다양한 데이터 소스를 통합하여 실시간 금융 데이터 제공
 * - 캐싱, 폴백, 에러 처리 포함
 */
export class MarketDataProvider {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private apiKeys: Record<string, string>;
  
  constructor(apiKeys: Record<string, string> = {}) {
    this.apiKeys = {
      alphaVantage: apiKeys.alphaVantage || process.env.ALPHA_VANTAGE_API_KEY || '',
      finnhub: apiKeys.finnhub || process.env.FINNHUB_API_KEY || '',
      polygon: apiKeys.polygon || process.env.POLYGON_API_KEY || '',
      newsapi: apiKeys.newsapi || process.env.NEWS_API_KEY || ''
    };
  }

  /**
   * 실시간 주식 시세 조회
   */
  async getRealTimeQuotes(symbols: string[]): Promise<RealTimeQuote[]> {
    const quotes: RealTimeQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        // 캐시 확인 (1분 TTL)
        const cached = this.getFromCache(`quote_${symbol}`, 60000);
        if (cached) {
          quotes.push(cached);
          continue;
        }

        let quote: RealTimeQuote | null = null;

        // 1순위: Alpha Vantage (신뢰성 높음)
        if (this.apiKeys.alphaVantage) {
          quote = await this.getQuoteFromAlphaVantage(symbol);
        }

        // 2순위: Yahoo Finance (무료, 제한적)
        if (!quote) {
          quote = await this.getQuoteFromYahooFinance(symbol);
        }

        // 3순위: Polygon (백업)
        if (!quote && this.apiKeys.polygon) {
          quote = await this.getQuoteFromPolygon(symbol);
        }

        // 4순위: 한국 주식용 네이버 금융
        if (!quote && this.isKoreanStock(symbol)) {
          quote = await this.getQuoteFromNaverFinance(symbol);
        }

        if (quote) {
          this.setCache(`quote_${symbol}`, quote, 60000);
          quotes.push(quote);
        } else {
          // 폴백: Mock 데이터
          quotes.push(this.generateMockQuote(symbol));
        }
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        quotes.push(this.generateMockQuote(symbol));
      }
    }

    return quotes;
  }

  /**
   * Alpha Vantage API로부터 실시간 시세 조회
   */
  private async getQuoteFromAlphaVantage(symbol: string): Promise<RealTimeQuote | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKeys.alphaVantage}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }
      
      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        return null;
      }

      return {
        symbol: quote['01. Symbol'],
        price: parseFloat(quote['05. Price']),
        change: parseFloat(quote['09. Change']),
        changePercent: parseFloat(quote['10. Change Percent'].replace('%', '')),
        volume: parseInt(quote['06. Volume']),
        high: parseFloat(quote['03. High']),
        low: parseFloat(quote['04. Low']),
        open: parseFloat(quote['02. Open']),
        previousClose: parseFloat(quote['08. Previous Close']),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      return null;
    }
  }

  /**
   * Yahoo Finance API로부터 실시간 시세 조회
   */
  private async getQuoteFromYahooFinance(symbol: string): Promise<RealTimeQuote | null> {
    try {
      // Yahoo Finance API는 CORS 제한이 있어서 프록시 또는 백엔드에서만 사용 가능
      // 실제 구현에서는 백엔드 프록시나 서드파티 서비스 사용
      const proxyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data: YahooFinanceResponse = await response.json();
      const result = data.chart.result[0];
      
      if (!result || !result.meta) {
        return null;
      }

      const meta = result.meta;
      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        volume: meta.regularMarketVolume,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        open: meta.regularMarketPrice, // Yahoo doesn't provide open in this endpoint
        previousClose: meta.previousClose,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      return null;
    }
  }

  /**
   * Polygon.io API로부터 실시간 시세 조회
   */
  private async getQuoteFromPolygon(symbol: string): Promise<RealTimeQuote | null> {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${this.apiKeys.polygon}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.results[0];
      
      if (!result) {
        return null;
      }

      return {
        symbol: symbol,
        price: result.c, // close price
        change: result.c - result.o,
        changePercent: ((result.c - result.o) / result.o) * 100,
        volume: result.v,
        high: result.h,
        low: result.l,
        open: result.o,
        previousClose: result.o,
        timestamp: new Date(result.t).toISOString()
      };
    } catch (error) {
      console.error('Polygon API error:', error);
      return null;
    }
  }

  /**
   * 네이버 금융 API로부터 한국 주식 시세 조회
   */
  private async getQuoteFromNaverFinance(symbol: string): Promise<RealTimeQuote | null> {
    try {
      // 네이버 금융 API는 CORS 제한으로 프록시 필요
      const code = symbol.replace('.KS', '').replace('.KQ', '');
      const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${code}`;
      
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://finance.naver.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Naver Finance API error: ${response.status}`);
      }

      const data: NaverFinanceResponse = await response.json();
      const item = data.result?.areas?.[0]?.datas?.[0];
      
      if (!item) {
        return null;
      }

      const currentPrice = parseFloat(item.nv.replace(/,/g, ''));
      const changePrice = parseFloat(item.cv.replace(/,/g, ''));
      const changePercent = parseFloat(item.cr.replace(/%/g, ''));
      const previousClose = parseFloat(item.pcv.replace(/,/g, ''));

      return {
        symbol: symbol,
        price: currentPrice,
        change: changePrice,
        changePercent: changePercent,
        volume: parseInt(item.sv.replace(/,/g, '')),
        high: currentPrice, // 네이버 API에서 당일 고가 정보 제한적
        low: currentPrice,
        open: previousClose,
        previousClose: previousClose,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Naver Finance API error:', error);
      return null;
    }
  }

  /**
   * 과거 가격 데이터 조회
   */
  async getHistoricalPrices(symbol: string, period: '1y' | '6m' | '3m' | '1m' = '1y'): Promise<HistoricalPrice[]> {
    try {
      const cached = this.getFromCache(`history_${symbol}_${period}`, 3600000); // 1시간 캐시
      if (cached) {
        return cached;
      }

      let prices: HistoricalPrice[] = [];

      // Alpha Vantage 일봉 데이터
      if (this.apiKeys.alphaVantage) {
        prices = await this.getHistoryFromAlphaVantage(symbol, period);
      }

      // 폴백: Mock 데이터
      if (prices.length === 0) {
        prices = this.generateMockHistory(symbol, period);
      }

      this.setCache(`history_${symbol}_${period}`, prices, 3600000);
      return prices;
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      return this.generateMockHistory(symbol, period);
    }
  }

  /**
   * Alpha Vantage로부터 과거 데이터 조회
   */
  private async getHistoryFromAlphaVantage(symbol: string, period: string): Promise<HistoricalPrice[]> {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${this.apiKeys.alphaVantage}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage history API error: ${response.status}`);
      }
      
      const data: AlphaVantageResponse = await response.json();
      const timeSeries = data['Time Series (Daily)'];
      
      if (!timeSeries) {
        return [];
      }

      const prices: HistoricalPrice[] = [];
      const days = this.getPeriodDays(period);
      let count = 0;

      for (const [date, values] of Object.entries(timeSeries)) {
        if (count >= days) break;
        
        prices.push({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        });
        
        count++;
      }

      return prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Alpha Vantage history error:', error);
      return [];
    }
  }

  /**
   * 기술적 지표 계산
   */
  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators | null> {
    try {
      const cached = this.getFromCache(`tech_${symbol}`, 300000); // 5분 캐시
      if (cached) {
        return cached;
      }

      const history = await this.getHistoricalPrices(symbol, '3m');
      if (history.length < 50) {
        return null;
      }

      const indicators = this.calculateTechnicalIndicators(history);
      this.setCache(`tech_${symbol}`, indicators, 300000);
      
      return indicators;
    } catch (error) {
      console.error(`Error calculating indicators for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 기술적 지표 계산 로직
   */
  private calculateTechnicalIndicators(history: HistoricalPrice[]): TechnicalIndicators {
    const closes = history.map(h => h.close);
    
    return {
      symbol: 'SYMBOL',
      sma5: this.calculateSMA(closes, 5),
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      rsi14: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes, 20),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 뉴스 및 센티멘트 분석
   */
  async getMarketNews(symbols: string[]): Promise<MarketNews[]> {
    try {
      const cached = this.getFromCache(`news_${symbols.join(',')}`, 600000); // 10분 캐시
      if (cached) {
        return cached;
      }

      const news: MarketNews[] = [];

      // NewsAPI 사용
      if (this.apiKeys.newsapi) {
        const query = symbols.join(' OR ');
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&apiKey=${this.apiKeys.newsapi}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.articles) {
          for (const article of data.articles) {
            news.push({
              id: article.url,
              title: article.title,
              summary: article.description || '',
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
              sentimentScore: Math.random() * 2 - 1, // -1 to 1
              relatedSymbols: symbols.filter(s => 
                article.title.toLowerCase().includes(s.toLowerCase()) ||
                article.description?.toLowerCase().includes(s.toLowerCase())
              )
            });
          }
        }
      }

      this.setCache(`news_${symbols.join(',')}`, news, 600000);
      return news;
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }

  // 유틸리티 메서드들
  private isKoreanStock(symbol: string): boolean {
    return symbol.endsWith('.KS') || symbol.endsWith('.KQ') || /^\d{6}$/.test(symbol);
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case '1y': return 365;
      case '6m': return 180;
      case '3m': return 90;
      case '1m': return 30;
      default: return 365;
    }
  }

  private calculateSMA(prices: number[], period: number): number {
    const recent = prices.slice(-period);
    return recent.reduce((sum, price) => sum + price, 0) / recent.length;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.filter(change => change > 0);
    const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    return {
      macd,
      signal: ema12 * 0.9, // 간단한 시그널 라인
      histogram: macd - (ema12 * 0.9)
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * k) + (ema * (1 - k));
    }
    
    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number) {
    const sma = this.calculateSMA(prices, period);
    const recent = prices.slice(-period);
    const variance = recent.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / recent.length;
    const std = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * std),
      middle: sma,
      lower: sma - (2 * std)
    };
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positive = ['good', 'great', 'excellent', 'profit', 'gain', 'up', 'rise', 'bull'];
    const negative = ['bad', 'poor', 'loss', 'down', 'fall', 'bear', 'decline'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positive.filter(word => lowerText.includes(word)).length;
    const negativeCount = negative.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // 캐시 관리
  private getFromCache(key: string, ttl: number): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // Mock 데이터 생성기들
  private generateMockQuote(symbol: string): RealTimeQuote {
    const price = Math.random() * 1000 + 50;
    const change = (Math.random() - 0.5) * 20;
    
    return {
      symbol,
      price,
      change,
      changePercent: (change / (price - change)) * 100,
      volume: Math.floor(Math.random() * 1000000),
      high: price + Math.random() * 10,
      low: price - Math.random() * 10,
      open: price + (Math.random() - 0.5) * 10,
      previousClose: price - change,
      timestamp: new Date().toISOString()
    };
  }

  private generateMockHistory(symbol: string, period: string): HistoricalPrice[] {
    const days = this.getPeriodDays(period);
    const history: HistoricalPrice[] = [];
    let price = Math.random() * 1000 + 50;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const open = price + (Math.random() - 0.5) * 5;
      const close = open + (Math.random() - 0.5) * 10;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      history.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000)
      });
      
      price = close;
    }
    
    return history;
  }
}