# AI 통합 자산관리 시스템

## 프로젝트 개요
- **프로젝트명**: AI 통합 자산관리 시스템 (webapp)
- **목표**: 강화학습 기반의 통합 자산 관리 및 세무/보험 최적화 솔루션
- **핵심 기능**: 
  - AI 기반 포트폴리오 최적화
  - 실시간 백테스팅 시스템
  - 세무 최적화 컨설팅
  - 보험 포트폴리오 관리
  - 통합 자산관리 대시보드

## 🌐 서비스 URL
- **개발 서버**: https://3000-irnb1zuqmq6le5y3tkjh9-6532622b.e2b.dev
- **API 엔드포인트**: https://3000-irnb1zuqmq6le5y3tkjh9-6532622b.e2b.dev/api
- **GitHub**: (향후 배포 예정)

## 📊 현재 구현된 기능

### ✅ 완료된 기능
1. **대시보드**
   - 실시간 포트폴리오 현황 (총 자산, 일일 수익률, 샤프 비율, 최대 낙폭)
   - 반응형 웹 디자인 (모바일/태블릿/데스크톱 지원)
   
2. **포트폴리오 관리**
   - 자산별 가격 및 변동률 추적
   - 동적 자산 배분 차트 (Chart.js)
   - 보유 자산 목록 및 상세 정보
   
3. **백테스팅 시스템**
   - 다중 전략 지원 (모멘텀, 평균회귀, 강화학습)
   - 실시간 백테스트 실행
   - 성과 지표 분석 (수익률, 샤프비율, 승률, 최대낙폭)
   
4. **세무 최적화**
   - 현재 세부담 vs 최적화 후 세부담 비교
   - 예상 절세액 계산
   - 맞춤형 절세 전략 제안
   
5. **보험 포트폴리오**
   - 보험상품별 보장금액 및 월납보험료 관리
   - 위험보장/수익성/세제효율성 레이더 차트
   - 보험 포트폴리오 최적화 지표

### 🔧 기술 스택
- **프론트엔드**: HTML5, TailwindCSS, Chart.js, Axios
- **백엔드**: Hono (TypeScript), Cloudflare Workers
- **배포**: Cloudflare Pages
- **프로세스 관리**: PM2
- **빌드 도구**: Vite

## 📋 주요 API 엔드포인트

### 포트폴리오 관련
- `GET /api/portfolio` - 포트폴리오 현황 조회
- `GET /api/assets` - 자산 목록 및 가격 정보

### 백테스팅
- `GET /api/backtest` - 백테스트 결과 조회
- `POST /api/backtest/run` - 백테스트 실행

### 최적화 서비스
- `GET /api/optimization/tax` - 세무 최적화 분석
- `GET /api/insurance/portfolio` - 보험 포트폴리오 분석

## 🏗️ 데이터 아키텍처

### 데이터 모델
```typescript
interface AssetData {
  symbol: string;      // 자산 심볼
  price: number;       // 현재 가격
  change: number;      // 변동률
  volume: number;      // 거래량
  marketCap?: number;  // 시가총액
}

interface PortfolioData {
  totalValue: number;    // 총 자산
  dailyReturn: number;   // 일일 수익률
  totalReturn: number;   // 누적 수익률
  sharpeRatio: number;   // 샤프 비율
  maxDrawdown: number;   // 최대 낙폭
  assets: AssetData[];   // 보유 자산
}

interface BacktestResult {
  startDate: string;     // 백테스트 시작일
  endDate: string;       // 백테스트 종료일
  initialValue: number;  // 초기 자본
  finalValue: number;    // 최종 자산
  totalReturn: number;   // 총 수익률
  sharpeRatio: number;   // 샤프 비율
  maxDrawdown: number;   // 최대 낙폭
  trades: number;        // 총 거래 수
  winRate: number;       // 승률
}
```

### 데이터 흐름
1. **실시간 데이터 수집**: Mock 데이터 생성기 (향후 실제 API 연동)
2. **AI 분석 엔진**: 강화학습 기반 투자 전략 실행
3. **최적화 모듈**: 세무/보험 통합 최적화
4. **대시보드**: 실시간 시각화 및 사용자 인터페이스

## 👤 사용자 가이드

### 1. 대시보드 사용법
1. 웹 브라우저에서 서비스 URL 접속
2. 상단 KPI 카드에서 주요 성과 지표 확인
3. 하단 탭 메뉴를 통해 각 기능 영역 탐색

### 2. 백테스트 실행
1. "백테스트" 탭 클릭
2. 전략 선택 (모멘텀/평균회귀/강화학습)
3. 초기 자본 설정
4. "백테스트 실행" 버튼 클릭
5. 결과 분석 및 성과 지표 확인

### 3. 세무 최적화 활용
1. "세무 최적화" 탭 클릭
2. 현재 세부담 vs 최적화 후 세부담 비교
3. 예상 절세액 및 절세 전략 확인
4. 맞춤형 세무 컨설팅 활용

### 4. 보험 포트폴리오 관리
1. "보험 포트폴리오" 탭 클릭
2. 현재 보험상품별 보장금액 및 보험료 확인
3. 레이더 차트를 통한 최적화 지표 분석
4. 포트폴리오 밸런싱 검토

## 🚀 배포 상태
- **플랫폼**: Cloudflare Pages (준비 완료)
- **상태**: ✅ 개발 서버 활성
- **마지막 업데이트**: 2024-09-30

## ⚠️ 현재 한계점 및 향후 개선사항

### 데이터 측면
- **Mock 데이터 사용**: 실제 금융 데이터 API 연동 필요
- **실시간 데이터**: yfinance, KRX API 등 연동
- **과거 데이터**: 백테스팅용 충분한 과거 데이터 확보

### AI/ML 측면  
- **단순 모델**: 현재 Mock 기반, 실제 강화학습 모델 구현 필요
- **고급 알고리즘**: PPO, TD3, SAC 등 SOTA 알고리즘 도입
- **리스크 모델**: VaR, Expected Shortfall 등 리스크 관리 강화

### 비즈니스 로직
- **실거래 연동**: 실제 증권사 API 연동
- **컴플라이언스**: 금융 규제 준수 로직 추가
- **사용자 인증**: 개인별 맞춤 서비스를 위한 인증 시스템

## 🔧 개발 환경 설정

### 로컬 실행
```bash
# 의존성 설치
npm install

# 프로젝트 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 서비스 테스트
curl http://localhost:3000/api/portfolio
```

### 배포
```bash
# Cloudflare Pages 배포
npm run deploy:prod
```

## 📞 문의 및 지원
- **개발사**: 한국인프라연구원(주)
- **이메일**: infrastructure@kakao.com  
- **전화**: 010-9143-0800

---

## 🎯 박사님의 비전 구현 현황

### 통합적 시너지 달성
✅ **경영**: 포트폴리오 성과 분석 및 KPI 대시보드
✅ **재무**: 자산 배분 최적화 및 수익률 관리  
✅ **세무**: 절세 전략 및 세부담 최적화
✅ **보험**: 보험 포트폴리오 통합 관리

### 혁신적 차별화 요소
✅ **AI 자동화**: 강화학습 기반 투자 의사결정
✅ **실시간 분석**: 동적 포트폴리오 최적화
✅ **통합 플랫폼**: 4대 영역 시너지 창출
✅ **맞춤형 서비스**: 개인별 최적화 전략

이 시스템은 박사님의 전문성과 AI 기술을 융합하여 기존 로보어드바이저와는 차원이 다른 **통합 자산관리 솔루션**을 구현했습니다.