# Deployment Guide

KFIP 2026 데모용 배포 셋업.

| 컴포넌트 | 호스팅 | 비용 |
|---|---|---|
| Frontend (`apps/web`) | Vercel | 무료 |
| Backend API (`apps/api`) | Koyeb | 무료 (free tier) |
| Postgres | Koyeb (self-hosted, **persistent volume 없음**) | 무료 |

> ⚠️ **데이터 영속성 없음**: 데모 초기 단계라서 "데이터 날아가도 OK" 전제. 컨테이너 재시작 시마다 `pnpm db:seed` 재실행 필요.

---

## 1. Backend: Koyeb

### 1-1. 가입 및 프로젝트 생성

1. https://koyeb.com → Sign up with GitHub (`jyami-kim`)
2. **Create App** 클릭
3. GitHub 권한에서 `StableHedge/stablehedge` 접근 허용

### 1-2. Service 1 — Postgres (먼저 만들기)

`Create App` → 두 개 service를 같은 App 안에 둘 거임.

**Source**:
- **Docker image**
- Image: `postgres:16`

**Service settings**:
- **Service name**: `postgres`
- **Service type**: `Internal` (퍼블릭 노출 X — 같은 App 내부에서만 접근)
- **Port**: `5432` (TCP)
- **Health check**: 비활성화 또는 TCP check (postgres는 HTTP healthz 없음)

**Environment variables**:
```
POSTGRES_USER=stablehedge
POSTGRES_PASSWORD=<generate; openssl rand -hex 16>
POSTGRES_DB=stablehedge
PGDATA=/var/lib/postgresql/data/pgdata
```

**Instance**: Eco (free tier — 256MB / 0.1 vCPU)

**Region**: Frankfurt 또는 Singapore (한국에서 latency 양호)

→ Deploy. 1-2분 후 service 상태 `Healthy`.

### 1-3. Service 2 — API

같은 App 안에 두 번째 service 추가.

**Source**:
- **GitHub repository**
- Repo: `StableHedge/stablehedge`
- Branch: `main`
- Auto-deploy: ✅

**Builder**:
- **Buildpack** (자동) 또는 **Dockerfile** (수동 — 우리는 buildpack 시도 후 실패하면 Dockerfile 추가)
- 만약 buildpack 자동 검출 실패 시 — **Build command** 명시:
  ```
  pnpm install --frozen-lockfile && pnpm --filter @stablehedge/xrpl-adapter build && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/api db:generate && pnpm --filter @stablehedge/api build
  ```
- **Run command**:
  ```
  cd apps/api && pnpm start
  ```

**Service settings**:
- **Service name**: `api`
- **Service type**: `Web` (퍼블릭 노출)
- **Port**: `3000`
- **Health check**: HTTP `GET /healthz`

**Environment variables**:
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Postgres 연결 — 같은 App 안의 internal service 이름으로 접근
DATABASE_URL=postgresql://stablehedge:<password>@postgres:5432/stablehedge?schema=public

# XRPL
XRPL_NETWORK=testnet
XRPL_RPC_URL=wss://s.altnet.rippletest.net:51233
XRPL_EXPLORER_BASE=https://testnet.xrpl.org

# Token
TOKEN_CURRENCY_CODE=USD
TOKEN_DISPLAY_LABEL=RUSD-DEMO

# Wallets — KFIP 직전엔 새로 발급 권장
ISSUER_SEED=sEdTuSGxPBaoxScV5PWVahetArPipeV
TREASURY_SEED=sEd7oKDV6vqpcnRLG1pgz3eYUBnzUky

# 새로 생성 (한 번만)
WALLET_ENCRYPTION_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
```

**Instance**: Eco (free tier)
**Region**: Postgres와 같은 region

→ Deploy.

### 1-4. 첫 배포 직후 확인

```bash
curl https://<your-koyeb-url>/healthz
# → {"status":"ok","network":"testnet"}
```

빈 DB 상태에서 `/api/funds` 같은 거 찌르면 빈 배열. 시드 필요.

### 1-5. 시드 1회 실행

API service의 콘솔(Koyeb의 Run Command 또는 SSH-like exec) 또는 로컬에서 production DB로 연결:

#### 옵션 A: Koyeb 대시보드의 콘솔 사용
- Service → **Console** 탭에서:
  ```bash
  cd apps/api
  pnpm db:seed
  pnpm scripts:open-trustlines
  ```

#### 옵션 B: Koyeb CLI
```bash
brew install koyeb/tap/koyeb
koyeb login
koyeb services exec <api-service-id> -- bash -c "cd apps/api && pnpm db:seed"
```

### 1-6. 컨테이너 재시작 후 데이터 복구

코드 push → 새 컨테이너 → DB 비어있음 → 시드 재실행. 매번 같은 명령 한 번.

> 📌 **편의용**: `apps/api/package.json`의 `start` 스크립트에 시드를 자동 포함하지 않는 게 좋음. 이미 데이터 있는데 다시 seed 돌면 unique 제약 충돌 — 단, 우리 seed.ts는 `upsert` 기반이라 안전. 하지만 매 재배포마다 외부 XRPL faucet 호출이 들어가서 부하·rate-limit 우려.

---

## 2. Frontend: Vercel

### 2-1. 가입 및 프로젝트 import

1. https://vercel.com → Sign in with GitHub
2. **Add New** → **Project** → `StableHedge/stablehedge` Import

### 2-2. 프로젝트 설정

Vercel이 모노레포 자동 감지 → **Root Directory** 묻는 화면:
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js (자동 감지)

**Build & Output settings** (Override 필요할 수 있음):
- **Install Command**:
  ```
  cd ../.. && pnpm install --frozen-lockfile
  ```
- **Build Command**:
  ```
  cd ../.. && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/web build
  ```
- **Output Directory**: `.next` (기본)

### 2-3. Environment Variables

```bash
NEXT_PUBLIC_API_BASE=https://<your-koyeb-api-url>
```

### 2-4. Deploy

→ 2-3분 후 `https://stablehedge.vercel.app` (또는 자동 생성된 도메인).

### 2-5. 동작 확인

브라우저로 접속 → Overview 페이지에 펀드 목록·투자자 목록 보이면 성공. 안 보이면:
- Network 탭에서 API 호출 URL 확인
- CORS 에러 시 — `apps/api/src/index.ts:30`의 `cors({ origin: true })` 가 와일드카드라 OK인데, 만약 막히면 Vercel 도메인 명시

---

## 3. 트러블슈팅

### Build 실패: "package not found" 또는 workspace 의존성 깨짐
- pnpm workspace dependencies (`@stablehedge/xrpl-adapter`, `shared-types`)는 빌드 순서 중요
- 위 build command에 명시적으로 순서 지정해둠

### Postgres 연결 안 됨
- Koyeb internal hostname이 service-name인지 확인 (`postgres`)
- 같은 App·같은 region 내부인지
- 비밀번호에 특수문자 있으면 URL encode 필요

### CORS 에러
- `apps/api/src/index.ts`의 cors 설정 확인 (`origin: true` 면 모든 origin 허용)
- production에선 Vercel 도메인 명시 권장

### `prisma migrate deploy` 실패
- 첫 실행 시 schema 적용 — DATABASE_URL 정확한지
- migration 폴더 (`apps/api/prisma/migrations`)가 푸시됐는지 확인

---

## 4. KFIP 직전 체크리스트

```
□ Koyeb postgres service 정상 (콘솔 ping)
□ Koyeb api service /healthz 200 OK
□ DB 시드 완료 (Fund 1, Investor 3, Investment 3)
□ 투자자 trustlines 모두 ACTIVE
□ Treasury 지갑에 IOU 잔액 충분 (>1.5M USDX)
□ Vercel 프론트 → Overview에서 펀드·투자자 보임
□ Distribution 생성 → Calculate → Submit 풀 시연 1회 성공
□ Settlement Monitor 화면 갱신 확인
□ Investor Statement 화면 갱신 확인
□ XRPL Explorer 링크 정상 작동
```

---

## 5. 기록할 운영 정보

배포 후 채울 것:

| 항목 | 값 |
|---|---|
| Koyeb App URL | `https://<...>.koyeb.app` |
| Koyeb Postgres password | (Koyeb env에만 보관) |
| Issuer address | (운영 시드에서) |
| Treasury address | (운영 시드에서) |
| Vercel deployment URL | `https://<...>.vercel.app` |
| 첫 시드 실행 일시 | |

---

## 6. 재배포·재시드 절차

```bash
# 1. 코드 변경 → push → Koyeb 자동 재배포 (2-3분)
git push origin main

# 2. (필요 시) 시드 재실행 — Koyeb 콘솔 또는 CLI
koyeb services exec <api-service-id> -- bash -c "cd apps/api && pnpm db:seed && pnpm scripts:open-trustlines"

# 3. Vercel 도메인은 항상 같음 — 자동 재배포만
```
