# StableHedge — E2E Testnet 시연 리포트

**시연 일시**: 2026-05-05 13:13~13:14 UTC
**네트워크**: XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)
**총 소요시간 (Submit ~ Settled)**: 19초 (3건 sequential Payment + Validation)

## 시나리오

운용사가 1개 펀드(Redwood Logistics Center Fund I)의 Q1-2026 분기 배당 **1,000,000 USD**를 3명 투자자에게 지분율대로 나눠 송금. UI의 두 액션 버튼만 눌러서 Calculate → Submit이 실제로 XRPL Testnet에 트랜잭션을 만든다.

## 결과

### 셋업 단계 (총 4건의 setup 트랜잭션)

| 단계 | 트랜잭션 | Tx Hash |
|---|---|---|
| Issuer DefaultRipple 활성 | AccountSet | [A2F86746...4613C](https://testnet.xrpl.org/transactions/A2F867469CFF2567F72545E79DF5B094593F8CFE86BCC8AC3CB9291E39C4613C) |
| Issuer Clawback 허용 | AccountSet (asfAllowTrustLineClawback) | [16594B84...0BFCED](https://testnet.xrpl.org/transactions/16594B843633E5915F6EEF356ED40B1D463A4E2B7D8A0C6AC5CEACA8CF0BFCED) |
| Treasury → Issuer Trustline | TrustSet | [27F41987...E856](https://testnet.xrpl.org/transactions/27F419873C3330DC97217E387836B3D1DFD3D58C269ED580BAFB55598221E856) |
| Issuer → Treasury 1.5M 초기 발행 | Payment | [3C9BFDBD...96B6](https://testnet.xrpl.org/transactions/3C9BFDBD981F6E5BB248E9D1B41BEEC6A0DC1496775822879BAC4AB8549196B6) (Ledger 17116038) |

### 투자자 Trustline (3건)

| Investor | Wallet | Trustline Tx |
|---|---|---|
| INV-0001 (Investor A) | r3Ew65zN9CpSsna6pd2buyoqbbqWZVcyV9 | [0BC6673C...3723](https://testnet.xrpl.org/transactions/0BC6673CDDEE230466F07758A7AA68B837ACC1D0D98E16994CF5205B348D3723) |
| INV-0002 (Investor B) | rUo8qBUTwpUtn5x5akr8tnQC1p1PxDbkWu | [FAAADFE6...96BA](https://testnet.xrpl.org/transactions/FAAADFE6D9299DF460B21B9360011B5117C2DEBE3F60D233CD80595F6E9C96BA) |
| INV-0003 (Investor C) | rGRrzt16avyKb2ACj5Na34V7UaCdTkM6K8 | [27989DB3...3F16](https://testnet.xrpl.org/transactions/27989DB3A94EAE30E59149E899946ED62C65B5978D53B802096CB4EF4B0D3F16) |

### 분기 배당 Payment (3건) — `Submit XRPL Payment` 버튼 1회로 발생

| Investor | Ownership % | Distribution | KRW Equivalent | Tx Hash | Ledger | Status |
|---|---|---|---|---|---|---|
| INV-0001 | 50.00% | 500,000 RUSD-DEMO | ₩650,000,000 | [F2246B91...6519](https://testnet.xrpl.org/transactions/F2246B912761E53BC2CC447BB87A95F960E932BA225262B125A29A75266A6519) | 17116146 | tesSUCCESS / Validated |
| INV-0002 | 30.00% | 300,000 RUSD-DEMO | ₩390,000,000 | [63C24325...EFECB](https://testnet.xrpl.org/transactions/63C2432598615D09D1489BE0BA9F539FD3AA0B46E6743CA4890CF570A22EFECB) | 17116148 | tesSUCCESS / Validated |
| INV-0003 | 20.00% | 200,000 RUSD-DEMO | ₩260,000,000 | [A8FCB126...5508](https://testnet.xrpl.org/transactions/A8FCB126C0E43F56FE75BF9E8F0E929AB683BF569B450A311D95927D65855508) | 17116150 | tesSUCCESS / Validated |

### XRPL RPC 직접 조회로 재검증 (외부 검증)

`F2246B91...6519` 트랜잭션을 XRPL Testnet 공식 rippled API로 fetch한 결과:

```json
{
  "Account": "rauCT6ABNPgQfBtoQFUxUpDnxudtJ6JCZ6",
  "Destination": "r3Ew65zN9CpSsna6pd2buyoqbbqWZVcyV9",
  "DestinationTag": 1,
  "Amount.value": "500000",
  "Amount.currency": "USD",
  "Amount.issuer": "rHPbc6YmNPzNWaBj8b84r3XSW2RNnqDs3L",
  "TransactionType": "Payment",
  "validated": true,
  "ledger_index": 17116146,
  "result": "tesSUCCESS",
  "delivered_amount.value": "500000",
  "Memos[0].MemoType": "706572696F64",   // hex("period")
  "Memos[0].MemoData": "51312D32303236"  // hex("Q1-2026")
}
```

## 검증 통과 항목

| 항목 | 결과 | 비고 |
|---|---|---|
| `pnpm -r typecheck` | ✅ all pass | 4 workspaces |
| `pnpm -r test` | ✅ 17/17 | currency 7, distribution-math 7, wallet-vault 3 |
| Prisma migration | ✅ 1 init migration | 11 tables |
| Setup-issuer (faucet → flag → 발행) | ✅ 4 tx hashes | 위 표 |
| Investor 3명 trustline | ✅ 3 tx hashes | 위 표 |
| Distribution 1,000,000 USD 분배 | ✅ 3 Validated Payments | 19초 |
| Settlement Monitor API | ✅ 잔액·플로우·트랜잭션 반영 | totalIssued: 1.5M, treasury: 500k, investor total: 1M |
| Investor Statement API | ✅ onChainProof + 배당수익률 분해 | distributionYield 100%, KRW 환산 정확 |
| Frontend 3 화면 (Next.js) | ✅ 모두 SSR로 렌더 | `/distributions/:id`, `/settlement-monitor/:fundId`, `/investors/:id` |
| XRPL RPC 외부 재검증 | ✅ tesSUCCESS / validated:true | 트랜잭션 영구 기록 확인 |

## 흐름 요약 (Figma 화면 → API → XRPL)

```
[Deal Distribution Dashboard]
  Calculate Distribution 클릭
    → POST /api/distributions/:id/calculate
    → DB: status DRAFT → READY, items 채움 (50%/30%/20%)
  Submit XRPL Payment 클릭
    → POST /api/distributions/:id/submit
    → 백엔드: items별 Payment(USD, issuer) → submitAndWait
    → 각 tx 결과 DB sync, items[].txHash + paymentStatus 업데이트
    → 모두 tesSUCCESS면 distribution.status=SETTLED
[XRPL Settlement Monitor]
    → GET /api/settlement-monitor/funds/:fundId
    → 잔액(treasury vs investor total), recentTransactions 노출
[Investor Statement]
    → GET /api/investors/:id/statements?period=Q1-2026
    → onChainProof.txHash + Explorer URL 노출 → 외부 검증 가능
```

## 다음 단계 후보

1. **XLS-56 Batch 마이그레이션** — 현재는 sequential Payment 3건. Batch(AllOrNothing)로 묶으면 단일 outer 트랜잭션으로 atomic 처리. mainnet 활성화 시점에 전환.
2. **multi-sig Treasury** — 단일 키 대신 SignerListSet으로 운용사+커스터디 2-of-2 모델.
3. **Compliance 시연** — Clawback / Deep Freeze 1건 데모 (이상거래 회수).
4. **인증/권한** — JWT + RBAC (운용사·정산담당·투자자·감사 4역할).
5. **Mainnet 전환 비용 계산서** — base reserve 10 XRP × 5계정 + 트러스트라인 2 XRP × N.
