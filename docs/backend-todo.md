# Backend TODO

데모(KFIP 2026) 진행 중 발견되는 백엔드 보강·정리 항목 누적 리스트.
완료 시 체크박스 토글 + 완료일 메모.

## 형식

- `[프로토타입 단순화]` — 데모용으로 일부러 둔 단순한 구현
- `[보강필요]` — 데모 후 또는 실제 서비스화 시 반드시 손봐야 함
- `[차별화]` — KFIP 어필 포인트로 추가하면 좋은 것

---

## FX (환율)

- [ ] `[보강필요]` **환율 자동 갱신 메커니즘 부재**
  - **현황**: `apps/api/src/services/fx-service.ts`의 `FALLBACK_KRW_PER_USD = 1468`로 demo-fixed.
    `recordFxRate()` 함수는 정의만 있고 호출하는 곳이 0개. `FxRate` 테이블은 사실상 비어있음.
  - **데모 결정**: 1468로 고정 (2026-05-06).
  - **데모 후 옵션**:
    - (A) `node-cron` + 무료 환율 API(`exchangerate.host`, `frankfurter.app`) 1시간 폴링 → `recordFxRate()`
    - (B) lazy-fetch: `getCurrentKrwPerUsd()`에서 DB 최신 row가 1h 이상 stale이면 외부 호출
    - (C) XLS-47 Price Oracle 등 온체인 오라클 (KFIP 차별화 포인트)
  - **영향 라우트**: `POST /api/distributions` (fxRate 미입력 시)

- [ ] `[보강필요]` **환율 수동 입력 Admin API 부재**
  - 외부 폴링 도입 전 stop-gap으로 `POST /api/admin/fx-rate { rate, source }` 한 줄짜리 라우트가 있으면 시연 중 즉시 갱신 가능.

---

## Onboarding / Admin (투자자 가입 영역)

- [ ] `[보강필요]` **투자자 가입·지분 등록 API 전무**
  - **현황**: 모든 mutating 라우트는 `apps/api/src/routes/distributions.ts`의 POST 3개뿐. `Investment` row는 오로지 `prisma/seed.ts`에서 하드코딩된 3명(INV-0001/2/3, bp 5000/3000/2000)으로만 들어감.
  - **관점**: 본질적으로 B2B 운용사·관리자 책임 영역. 외부 KYC/AML 시스템 결과를 백엔드가 수령하는 형태로 두는 게 자연스러움 → Admin API 또는 내부 시스템 webhook으로 격상.
  - **추가해야 할 라우트**:
    - `POST /api/investors` — 투자자 등록 (externalId, name, walletAddress)
    - `POST /api/funds/:fundId/investments` — 펀드 가입 + ownershipBp + beginningValueUsd
    - `PATCH /api/funds/:fundId/investments/:id` — 지분 변경
    - `POST /api/funds/:fundId/investments/:id/open-trustline` — Trustline 자동 개설 (현재 `scripts/open-investor-trustlines.ts` 일괄)
  - **인증**: Admin 전용 가드 필요 (현재 JWT_SECRET stub만 존재).

- [ ] `[보강필요]` **인증/인가 stub 상태**
  - `JWT_SECRET=change-me-in-prod`, 실제 로그인·세션 미구현.
  - 라우트별 권한(PortfolioManager / SettlementOfficer / Investor / Auditor / Admin) 미적용.

---

## 분배 계산 (`/calculate`) 엣지 케이스

- [ ] `[보강필요]` **`ownershipBp` 합 검증 정책 미정**
  - **현황**: `distribution-math.ts`는 `total × bp / 10000`만 수행. 합이 11,000이어도 그대로 곱셈 → Treasury 잔액 초과 → `/submit` 시 일부 투자자 송금만 성공하고 뒷쪽이 FAILED. 데이터 정합성 깨짐.
  - **결정 필요**: 옵션 중 택 1
    - (A) 엄격: 합 = 10,000 강제, 다르면 `/calculate`에서 reject (데모 안전)
    - (B) 현실: 합 ≤ 10,000 허용, 차액은 `Distribution.unallocatedUsd` 컬럼에 명시 기록
    - (C) 그대로 둠 (현재 — 위험)
  - **추천**: 데모 ≥ A, 데모 후 ≥ B + 스키마 확장.

- [ ] `[보강필요]` **`/calculate` 재호출 시 `DistributionItem.id`가 매번 새로 발급됨**
  - 현재 구현은 `deleteMany` → `createMany`. 외부에서 `distributionItemId`를 캐싱·참조하면 깨짐.
  - 안정 ID 필요 시 `@@unique([distributionId, investorId])` upsert로 전환.

- [ ] `[보강필요]` **FAILED 상태에서 `/calculate` 재호출 정책 미정**
  - 현재 가드는 SUBMITTED/SETTLED만 막음. FAILED 상태에서는 재계산 통과 → 부분 송금된 투자자가 있는데 다시 계산 가능. 의도 확정 + 가드 보강 필요.

---

## XRPL 운영

- [ ] `[프로토타입 단순화]` **Treasury 단일 키 (multi-sig 미적용)**
  - 현재 `Wallet.encryptedSeed` 1개로 `treasury.sign`. 운영 시 `SignerListSet` + 여러 서명자 필요.

- [ ] `[보강필요]` **XLS-56 Batch atomic 분배 미적용**
  - 현재 `submitDistributionPayments`는 sequential. 한 건 실패 시 앞쪽은 송금되고 뒤쪽은 안 됨.
  - mainnet에서 amendment 활성화 시 `Batch (AllOrNothing)` 모드로 마이그레이션 — `xrpl-adapter/src/distribution.ts:48` 주석 참고.

- [ ] `[보강필요]` **Settlement Monitor의 잔액이 추정치**
  - `routes/settlement-monitor.ts`의 `treasuryBalance = totalIssued - investorBalancesTotal`은 라이트 프록시. mainnet 가면 `account_lines` 응답 기반으로 교체.

---

## 차별화 (선택)

- [ ] `[차별화]` **XLS-47 Price Oracle 연동** — 온체인 환율로 fxReferenceRate 산정
- [ ] `[차별화]` **DID/Credentials (XLS-40, XLS-70)** — 투자자 KYC를 온체인 자격증명으로
- [ ] `[차별화]` **Hooks / Smart Escrow** — 분배금 vesting (분기마다 자동 release)
- [ ] `[차별화]` **MPT (Multi-Purpose Token)** — 현재 IOU 대신 차세대 토큰 표준으로 재발행

---

## 기록 가이드

새 TODO 추가 시:
1. 카테고리(FX / Onboarding / 분배 / XRPL 운영 / 차별화) 중 적절한 곳에 append
2. 라벨: `[프로토타입 단순화]` / `[보강필요]` / `[차별화]`
3. **현황**(코드 위치 포함) + **결정 필요**(옵션) + **영향**(라우트/컴포넌트) 적기
4. 완료 시 `[ ]` → `[x]` + 완료일·커밋 해시 메모
