# StableHedge — Backend Monorepo

해외 부동산 펀드의 분기 배당을 XRPL 위에서 atomic하게 정산하는 B2B 인프라.
KFIP 2026 데모를 위해 Figma UI 3화면과 1:1로 매핑되는 백엔드를 제공한다.

## Figma 화면 ↔ API 매핑

| Figma 화면 | 핵심 액션 | 호출되는 API |
|---|---|---|
| **Deal Distribution Dashboard** | `Calculate Distribution` 버튼 (오프체인 계산) | `POST /api/distributions/:id/calculate` |
| **Deal Distribution Dashboard** | **`Submit XRPL Payment` 버튼 (실제 testnet 트랜잭션)** | **`POST /api/distributions/:id/submit`** |
| **Deal Distribution Dashboard** | 화면 진입 시 데이터 로드 | `GET /api/distributions/:id` |
| **XRPL Settlement Monitor** | 화면 진입 시 데이터 로드 | `GET /api/settlement-monitor/funds/:fundId` |
| **Investor Statement** | 분기·펀드별 명세서 조회 | `GET /api/investors/:investorId/statements?period=Q1-2026` |

## 상태 머신

**Distribution status** (Deal Distribution Dashboard 코멘트 정의)
```
DRAFT → READY → SUBMITTED → SETTLED
                          ↘ FAILED
```

**Payment status** (XRPL Settlement Monitor 코멘트 정의)
```
PREPARED → SUBMITTED → VALIDATED → REFLECTED
                    ↘ FAILED
```

## 디렉토리

```
.
├── apps/
│   ├── api/                  Fastify + TypeScript + Prisma + xrpl.js
│   └── web/                  (프론트팀 진입점, 빈 폴더)
├── packages/
│   ├── xrpl-adapter/         xrpl.js 래핑 — issuer 셋업·트러스트라인·Payment·watcher
│   └── shared-types/         API ↔ Web 공유 DTO (Figma 스크린 모양)
├── scripts/
│   ├── setup-issuer.ts       Issuer/Treasury 지갑 생성 + flag 설정 + 초기 issuance
│   └── open-investor-trustlines.ts  투자자 지갑별 trustline 개설
└── docs/                     (설계 문서)
```

## 사전 준비

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- PostgreSQL 14+ (로컬 또는 Docker)
- 인터넷 (XRPL Testnet 접근)

## 설치 및 첫 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. .env 생성 + 암호화 키 만들기
cp .env.example .env
echo "WALLET_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# 3. PostgreSQL 준비 (로컬 예시)
createdb stablehedge

# 4. Prisma 마이그레이션
pnpm db:migrate

# 5. testnet에서 Issuer/Treasury 지갑 발급 + DefaultRipple/Clawback 플래그 설정
#    + Treasury로 1,500,000 USDX 초기 발행
pnpm scripts:setup-issuer
# 출력에 ISSUER_SEED= 와 TREASURY_SEED= 가 나오면 .env에 복사

# 6. 시드 데이터 (펀드 1개 + 투자자 3명) 입력
pnpm db:seed

# 7. 투자자 trustline 개설
pnpm scripts:open-trustlines

# 8. 서버 기동
pnpm dev
# → http://localhost:3000
```

## 핵심 데모 시나리오 (Submit XRPL Payment)

```bash
# Distribution 생성 (Q1 2026, 100만 USD)
curl -X POST http://localhost:3000/api/distributions \
  -H "content-type: application/json" \
  -d '{
    "fundId": "fund-redwood",
    "period": "Q1-2026",
    "periodStart": "2026-01-01T00:00:00Z",
    "periodEnd": "2026-03-31T23:59:59Z",
    "totalDistributableUsd": "1000000",
    "fxReferenceRateKrwPerUsd": "1468"
  }'
# → { "id": "...", "status": "DRAFT" }

# Calculate Distribution 버튼 (지분율 × 총액)
curl -X POST http://localhost:3000/api/distributions/<id>/calculate
# → 투자자별 amountUsd 채워짐, status = READY

# 화면 데이터 확인
curl http://localhost:3000/api/distributions/<id>
# → Deal Distribution Dashboard 페이로드

# *** 실제 XRPL Testnet Payment 실행 ***
curl -X POST http://localhost:3000/api/distributions/<id>/submit
# → 각 투자자에게 USDX Payment N건 제출, txHash 응답
#   투자자별 paymentStatus가 PREPARED → SUBMITTED → VALIDATED 로 진행

# Settlement Monitor 데이터
curl http://localhost:3000/api/settlement-monitor/funds/fund-redwood

# Investor Statement (Investor A)
curl 'http://localhost:3000/api/investors/<investorId>/statements?period=Q1-2026'
```

## XRPL 연동 메모

- 토큰 표준: 1차 데모는 **TrustLine 토큰**(IOU). currencyCode = `USD` (3-char), displayLabel = `RUSD-DEMO` (UI 라벨용)
- Issuer flags: `asfDefaultRipple`, `asfAllowTrustLineClawback` (XLS-39)
- 트랜잭션: `TrustSet`, `Payment` (Issued Currency), `AccountSet`. **XLS-56 Batch는 mainnet 활성 후 도입 예정** — 현재는 sequential Payment.
- 메모: `period`, `fundId`, `distributionId`, `investorExternalId`, `distributionItemId` 를 Memos에 박는다. 감사 추적용.
- DestinationTag: investor externalId의 숫자 부분 (예: INV-0001 → 1)

## 잘라낸 것 (1주 데모 스코프 외)

- 실제 KYC/AML
- multi-sig Treasury (단일 키로 시작)
- XLS-56 Batch 트랜잭션 (mainnet 활성화 시점에 마이그레이션)
- AMM, escrow vesting
- Hooks/Smart Escrow
- 인증 (JWT 골격만 있음, 실제 로그인은 stub)
