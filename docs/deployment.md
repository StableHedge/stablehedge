# Deployment Guide

현재 배포 전략은 `Frontend = Vercel Hobby`, `Backend = Render Free Web Service`, `DB = Render Postgres free` 기준이다.
KFIP 2026 데모용 임시안이며, `main` push마다 자동 배포된다.

## 현재 상태 (live)

| 컴포넌트 | 호스팅 | URL | 비용/특성 |
|---|---|---|---|
| Frontend (`apps/web`) | Vercel Hobby | https://stablehedge-web.vercel.app | 무료, sleep 없음 |
| Backend API (`apps/api`) | Render Free Web Service | https://stablehedge.onrender.com | 무료, 15분 idle 시 spin down |
| DB | Render Postgres free | (internal only) | 무료, 2026-06-05 만료, 백업 X |

주의:
- Render Free Web은 idle 후 sleep → 첫 요청 시 30초+ cold start. 데모 직전 ping 필요.
- Render Postgres free는 90일 후 만료 → 그 전에 마이그레이션 ([Issue #7](https://github.com/StableHedge/stablehedge/issues/7) 참조).
- 자동 백업 없음. 데이터 복구는 시드 재실행으로 ([Issue #3](https://github.com/StableHedge/stablehedge/issues/3) 참조).
- 장기 목표는 Cloudflare Pages + Supabase ([Issue #4](https://github.com/StableHedge/stablehedge/issues/4)).

---

## 1. Frontend: Vercel

### 1-1. 프로젝트 import

1. https://vercel.com 에서 GitHub로 로그인
2. `Add New` → `Project`
3. 이 레포 import
4. Root Directory: `apps/web`

### 1-2. Build 설정

- Install Command:
  ```bash
  cd ../.. && pnpm install --frozen-lockfile
  ```
- Build Command:
  ```bash
  cd ../.. && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/web build
  ```

### 1-3. 환경변수

```bash
NEXT_PUBLIC_API_BASE=https://<render-backend-domain>
```

---

## 2. Backend: Render Free

### 2-1. 왜 Render로 두는가

현재 API는 단순 요청/응답만 처리하지 않는다.

- Fastify 서버를 직접 `listen()` 한다.
- 서버 기동 후 `startLedgerWatcher()`가 XRPL WSS 연결을 유지한다.

즉, 지금 시점에는 serverless보다 long-running web service가 더 잘 맞는다.

### 2-2. Render 서비스 생성

1. https://render.com 에서 GitHub로 로그인
2. `New` → `Web Service`
3. 이 레포 연결
4. 서비스 설정:
   - Name: `stablehedge-api`
   - Region: `Singapore` 또는 `Oregon`
   - Branch: `main`
   - Instance Type: `Free`
   - Root Directory: 비움

### 2-3. Build / Start Command

- Build Command:
  ```bash
  pnpm install --frozen-lockfile --prod=false && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/xrpl-adapter build && pnpm --filter @stablehedge/api db:generate && pnpm --filter @stablehedge/api build
  ```
  > `--prod=false`는 필수: Render는 `NODE_ENV=production`을 자동 주입하므로, 이 플래그가 없으면 pnpm이 devDependencies(`@types/node`, `typescript`, `tsx` 등)를 건너뛰어 빌드가 실패한다.

- Start Command:
  ```bash
  cd apps/api && pnpm start
  ```

현재 `pnpm start`는 `prisma migrate deploy && node dist/index.js`를 수행한다.

### 2-4. Render에서 미리 준비할 값

Render 쪽에서는 아래만 먼저 확보한다.

- GitHub repo 연결
- `Auto-Deploy: On Commit`

민감한 환경변수 값은 Render 서비스의 `Environment` 탭에 넣고, GitHub에는 두지 않는다.

### 2-5. Health Check

- Path: `/healthz`

이 값은 배포 readiness 확인용이다.

---

## 3. DB 운영 원칙

Render Postgres free는 managed Postgres라 redeploy/restart 시 데이터 유지된다.
다만 **자동 백업이 없고 90일 만료**가 있어, 운영용이 아닌 데모용으로만 취급한다.

원칙:
- 모든 데이터는 seed로 재현 가능해야 함 (자동 백업 X 대비)
- 만료(2026-06-05) 전 Supabase 마이그레이션 ([Issue #7](https://github.com/StableHedge/stablehedge/issues/7))
- 시연 직전 smoke test로 상태 확인

권장 절차:
1. 배포 후 `/healthz` 확인
2. DB migration 적용 확인 (자동 — `prisma migrate deploy` in start command)
3. 시드 실행 (필요 시)
4. trustline 개설 (필요 시)
5. 데모 시나리오 smoke test

---

## 4. Seed / 복구

Free 플랜은 SSH 미지원이라 백엔드 컨테이너 내부에서 직접 실행 불가. 두 가지 방법:

### 방법 A. 로컬에서 외부 접속 (현재 사용)

1. Render Postgres `ipAllowList`에 본인 외부 IP를 임시 추가:
   ```bash
   curl -X PATCH -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
     "https://api.render.com/v1/postgres/<pg-id>" \
     -d '{"ipAllowList":[{"cidrBlock":"<YOUR_IP>/32","description":"name"}]}'
   ```
2. `.env`에 `PROD_DATABASE_URL_EXTERNAL`, `PROD_WALLET_ENCRYPTION_KEY` 등 보관
3. 실행:
   ```bash
   cd apps/api
   DATABASE_URL="$PROD_DATABASE_URL_EXTERNAL?sslmode=require" \
   WALLET_ENCRYPTION_KEY="$PROD_WALLET_ENCRYPTION_KEY" \
   ISSUER_SEED="$ISSUER_SEED" TREASURY_SEED="$TREASURY_SEED" \
     pnpm db:seed
   pnpm exec tsx ../../scripts/open-investor-trustlines.ts fund-redwood
   ```
4. 작업 끝나면 allowlist 비우기: `{"ipAllowList":[]}`

### 방법 B. Backend Admin API ([Issue #3](https://github.com/StableHedge/stablehedge/issues/3) — 예정)

머지 후엔 IP allowlist 없이 curl 한 줄로:
```bash
curl -X POST -H "X-Admin-Token: $ADMIN_API_TOKEN" \
  https://stablehedge.onrender.com/api/admin/seed
```

데모 직전 또는 깨진 상태 복구 시 동일하게 사용.

---

## 5. 이후 목표: Serverless 분리

현재 Render 배포는 임시안. 장기 목표는 **Cloudflare Pages + Cloudflare Pages Functions + Supabase**로 풀-serverless·운영비 0 구조로 이전.

자세한 마이그레이션 단계와 우선순위는 GitHub Issues 참조:
- [Issue #4](https://github.com/StableHedge/stablehedge/issues/4) Backend serverless 구조 재설계 (parent)
- [Issue #5](https://github.com/StableHedge/stablehedge/issues/5) ledger-watcher 필요성 검증·재설계 (선결 과제)
- [Issue #7](https://github.com/StableHedge/stablehedge/issues/7) Render Postgres → Supabase 마이그레이션

목표 구조:
- Web: Cloudflare Pages
- API: Cloudflare Pages Functions
- DB: Supabase Postgres
- (선택) Auth: Supabase Auth, Realtime: Supabase Realtime

---

## 6. 현실적인 해석

현재 Render 선택의 전제:

- 비용 0원 우선
- 데모용
- Render Free Web sleep 감수 (cold start ~30초)
- Render Postgres 90일 만료 인지 (2026-06-05)
- 자동 백업 없음 — seed로 재현 가능하게 유지
- 이후 Supabase 및 serverless 분리 예정 ([Issue #4](https://github.com/StableHedge/stablehedge/issues/4))

---

## 7. 트러블슈팅

### 배포는 성공했는데 첫 응답이 느림

- Render Free Web sleep 후 cold start (~30초)
- 시연 직전 `/healthz` 미리 ping하거나 외부 keep-alive 핑 (cron-job.org 등)

### DB가 비어 있음

- Render Postgres는 redeploy로 유실 안 됨 (managed)
- 의도적 reset이거나 90일 만료 후 새 인스턴스라면 §4 Seed/복구 절차

### `/submit` 이후 상태 반영이 애매함

- `submitAndWait`이 동기 응답 — 정상 케이스에선 즉시 DB 반영됨
- 비정상 케이스 (응답 누락 등) 자가 수복은 ledger-watcher 의존 ([Issue #5](https://github.com/StableHedge/stablehedge/issues/5) 검증 중)

### build 실패

- workspace 패키지 빌드 순서: `shared-types` → `xrpl-adapter` → `api`
- `pnpm install`에 `--prod=false` 빠지면 devDeps 누락으로 tsc 실패 (§2-3)
- tsc 실패 시 `dist/` 누락 → 런타임 `MODULE_NOT_FOUND`. tsconfig.json의 `rootDir`/`include`/`exclude` 확인.
