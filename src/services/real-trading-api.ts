/**
 * Real Trading API Integration Service
 * 한국 주요 증권사 실거래 API 통합 서비스
 * 
 * 지원 증권사:
 * - 키움증권 OpenAPI+
 * - NH투자증권 나무 API
 * - KB증권 Open API
 */

export interface BrokerConfig {
  name: string;
  apiKey: string;
  secretKey: string;
  accountNo: string;
  baseUrl: string;
  isDemo: boolean;
}

export interface StockOrder {
  symbol: string;          // 종목코드 (예: "005930")
  orderType: 'buy' | 'sell';
  orderMethod: 'market' | 'limit';
  quantity: number;        // 주문수량
  price?: number;          // 지정가 주문시 가격
  accountNo: string;       // 계좌번호
}

export interface OrderResult {
  orderId: string;         // 주문번호
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  executedQty: number;     // 체결수량
  executedPrice: number;   // 체결가격
  timestamp: string;       // 주문시간
  fee: number;            // 수수료
}

export interface AccountBalance {
  totalAssets: number;     // 총 자산
  cashBalance: number;     // 현금잔고
  stockValue: number;      // 주식평가금액
  purchaseAmount: number;  // 매입금액
  evaluationPL: number;    // 평가손익
  positions: Position[];   // 보유종목
}

export interface Position {
  symbol: string;          // 종목코드
  symbolName: string;      // 종목명
  quantity: number;        // 보유수량
  avgPrice: number;        // 평균단가
  currentPrice: number;    // 현재가
  evaluationAmount: number; // 평가금액
  profitLoss: number;      // 손익금액
  profitLossRate: number;  // 손익률
}

export interface RealTimePrice {
  symbol: string;          // 종목코드
  price: number;           // 현재가
  change: number;          // 전일대비
  changeRate: number;      // 등락률
  volume: number;          // 거래량
  high: number;           // 고가
  low: number;            // 저가
  timestamp: string;       // 시세시간
}

/**
 * 키움증권 OpenAPI+ 연동 서비스
 */
export class KiwoomTradingService {
  private config: BrokerConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  /**
   * 키움 API 인증 토큰 발급
   */
  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.config.apiKey,
          secretkey: this.config.secretKey
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Kiwoom authentication failed:', error);
      return false;
    }
  }

  /**
   * 토큰 유효성 검사 및 갱신
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      return await this.authenticate();
    }
    return true;
  }

  /**
   * 계좌 잔고 조회
   */
  async getAccountBalance(): Promise<AccountBalance> {
    if (!await this.ensureValidToken()) {
      throw new Error('Authentication failed');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'appkey': this.config.apiKey,
            'appsecret': this.config.secretKey,
            'tr_id': 'TTTC8434R', // 계좌잔고조회 거래ID
            'custtype': 'P' // 개인
          }
        }
      );

      const data = await response.json();
      
      // 키움 API 응답을 표준 형식으로 변환
      return {
        totalAssets: parseFloat(data.output2.tot_evlu_amt || '0'),
        cashBalance: parseFloat(data.output2.prvs_rcdl_excc_amt || '0'),
        stockValue: parseFloat(data.output2.scts_evlu_amt || '0'),
        purchaseAmount: parseFloat(data.output2.pchs_amt_smtl_amt || '0'),
        evaluationPL: parseFloat(data.output2.evlu_pfls_smtl_amt || '0'),
        positions: this.parsePositions(data.output1 || [])
      };
    } catch (error) {
      console.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * 보유종목 파싱
   */
  private parsePositions(rawPositions: any[]): Position[] {
    return rawPositions.map(pos => ({
      symbol: pos.pdno,
      symbolName: pos.prdt_name,
      quantity: parseInt(pos.hldg_qty || '0'),
      avgPrice: parseFloat(pos.pchs_avg_pric || '0'),
      currentPrice: parseFloat(pos.prpr || '0'),
      evaluationAmount: parseFloat(pos.evlu_amt || '0'),
      profitLoss: parseFloat(pos.evlu_pfls_amt || '0'),
      profitLossRate: parseFloat(pos.evlu_pfls_rt || '0')
    }));
  }

  /**
   * 주식 주문 (매수/매도)
   */
  async placeOrder(order: StockOrder): Promise<OrderResult> {
    if (!await this.ensureValidToken()) {
      throw new Error('Authentication failed');
    }

    try {
      const trId = order.orderType === 'buy' ? 'TTTC0802U' : 'TTTC0801U';
      
      const orderData = {
        CANO: order.accountNo.slice(0, 8),        // 계좌번호 앞 8자리
        ACNT_PRDT_CD: order.accountNo.slice(-2),  // 계좌번호 뒤 2자리
        PDNO: order.symbol,                       // 종목코드
        ORD_DVSN: order.orderMethod === 'market' ? '01' : '00', // 주문구분 (01:시장가, 00:지정가)
        ORD_QTY: order.quantity.toString(),       // 주문수량
        ORD_UNPR: order.price?.toString() || '0'  // 주문단가
      };

      const response = await fetch(
        `${this.config.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'appkey': this.config.apiKey,
            'appsecret': this.config.secretKey,
            'tr_id': trId,
            'custtype': 'P',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        }
      );

      const data = await response.json();
      
      if (data.rt_cd === '0') {
        return {
          orderId: data.output.KRX_FWDG_ORD_ORGNO + data.output.ODNO,
          status: 'pending',
          executedQty: 0,
          executedPrice: 0,
          timestamp: new Date().toISOString(),
          fee: 0 // 추후 체결 시 계산
        };
      } else {
        throw new Error(`주문 실패: ${data.msg1}`);
      }
    } catch (error) {
      console.error('Order placement failed:', error);
      throw error;
    }
  }

  /**
   * 실시간 주가 조회
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    if (!await this.ensureValidToken()) {
      throw new Error('Authentication failed');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${symbol}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'appkey': this.config.apiKey,
            'appsecret': this.config.secretKey,
            'tr_id': 'FHKST01010100'
          }
        }
      );

      const data = await response.json();
      const output = data.output;
      
      return {
        symbol: symbol,
        price: parseFloat(output.stck_prpr),
        change: parseFloat(output.prdy_vrss),
        changeRate: parseFloat(output.prdy_ctrt),
        volume: parseInt(output.acml_vol),
        high: parseFloat(output.stck_hgpr),
        low: parseFloat(output.stck_lwpr),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get real-time price:', error);
      throw error;
    }
  }
}

/**
 * NH투자증권 나무 API 연동 서비스
 */
export class NHTradingService {
  private config: BrokerConfig;
  private accessToken: string | null = null;

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: this.config.apiKey,
          password: this.config.secretKey
        })
      });

      const data = await response.json();
      
      if (data.token) {
        this.accessToken = data.token;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('NH authentication failed:', error);
      return false;
    }
  }

  async getAccountBalance(): Promise<AccountBalance> {
    // NH API 구현 (키움과 유사한 패턴)
    // 실제 NH API 문서에 따라 구현
    throw new Error('NH API implementation needed');
  }

  async placeOrder(order: StockOrder): Promise<OrderResult> {
    // NH API 주문 구현
    throw new Error('NH API implementation needed');
  }

  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    // NH API 실시간 시세 구현
    throw new Error('NH API implementation needed');
  }
}

/**
 * 통합 실거래 API 매니저
 */
export class RealTradingManager {
  private brokers: Map<string, KiwoomTradingService | NHTradingService> = new Map();
  private primaryBroker: string = 'kiwoom';

  /**
   * 증권사 서비스 등록
   */
  registerBroker(name: string, service: KiwoomTradingService | NHTradingService) {
    this.brokers.set(name, service);
  }

  /**
   * 주 거래 증권사 설정
   */
  setPrimaryBroker(brokerName: string) {
    if (this.brokers.has(brokerName)) {
      this.primaryBroker = brokerName;
    } else {
      throw new Error(`Broker ${brokerName} not registered`);
    }
  }

  /**
   * 계좌 잔고 조회 (주 거래 증권사)
   */
  async getAccountBalance(): Promise<AccountBalance> {
    const broker = this.brokers.get(this.primaryBroker);
    if (!broker) {
      throw new Error('Primary broker not found');
    }
    return broker.getAccountBalance();
  }

  /**
   * 주문 실행 (주 거래 증권사)
   */
  async placeOrder(order: StockOrder): Promise<OrderResult> {
    const broker = this.brokers.get(this.primaryBroker);
    if (!broker) {
      throw new Error('Primary broker not found');
    }
    return broker.placeOrder(order);
  }

  /**
   * 실시간 시세 조회 (모든 등록된 증권사에서 조회 후 최신값 반환)
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    const prices: RealTimePrice[] = [];
    
    for (const [name, broker] of this.brokers) {
      try {
        const price = await broker.getRealTimePrice(symbol);
        prices.push(price);
      } catch (error) {
        console.error(`Failed to get price from ${name}:`, error);
      }
    }
    
    if (prices.length === 0) {
      throw new Error('No price data available from any broker');
    }
    
    // 가장 최신 시세 반환 (타임스탬프 기준)
    return prices.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }

  /**
   * 모든 등록된 증권사 인증
   */
  async authenticateAll(): Promise<boolean[]> {
    const results: Promise<boolean>[] = [];
    
    for (const [name, broker] of this.brokers) {
      results.push(
        broker.authenticate().catch(error => {
          console.error(`Authentication failed for ${name}:`, error);
          return false;
        })
      );
    }
    
    return Promise.all(results);
  }
}

// 환경변수 기반 설정 예시
export function createBrokerConfigs(): { [key: string]: BrokerConfig } {
  return {
    kiwoom: {
      name: 'Kiwoom Securities',
      apiKey: process.env.KIWOOM_API_KEY || '',
      secretKey: process.env.KIWOOM_SECRET_KEY || '',
      accountNo: process.env.KIWOOM_ACCOUNT_NO || '',
      baseUrl: process.env.KIWOOM_BASE_URL || 'https://openapi.kiwoom.com',
      isDemo: process.env.NODE_ENV !== 'production'
    },
    nh: {
      name: 'NH Investment & Securities',
      apiKey: process.env.NH_API_KEY || '',
      secretKey: process.env.NH_SECRET_KEY || '',
      accountNo: process.env.NH_ACCOUNT_NO || '',
      baseUrl: process.env.NH_BASE_URL || 'https://openapi.nhqv.com',
      isDemo: process.env.NODE_ENV !== 'production'
    }
  };
}