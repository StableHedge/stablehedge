# Deployment Guide

KFIP 2026 데모용 배포 셋업.

| 컴포넌트 | 호스팅 | 비용 |
|---|---|---|
| Frontend (`apps/web`) | Vercel | 무료 |
| Backend API (`apps/api`) | Northflank (Sandbox) | 무료 |
| Postgres | Northflank Addon (Free) | 무료 |

> ✅ **Always-on**: idle sleep 없음. KFIP 시연 직전 cold start 걱정 불필요.
> ✅ **데이터 영속**: Northflank Postgres addon은 persistent storage 포함.

---

## 1. Backend: Northflank

### 1-1. 가입 및 프로젝트 생성

1. https://northflank.com → **Sign up with GitHub** (`jyami-kim`)
2. GitHub 권한에서 `StableHedge/stablehedge` 접근 허용
3. **Create new project**:
   - Name: `stablehedge`
   - Region: `Tokyo` 또는 `Singapore` (한국에서 latency 양호)
   - Plan: **Sandbox (Free)**

> Sandbox 한도: 2 services + 2 databases + 2 cron jobs, 모두 always-on.

### 1-2. Postgres Addon 추가 (먼저 만들기)

프로젝트 화면에서:

1. **+ Create new** → **Addon** → **PostgreSQL**
2. 설정:
   ```
   Name:       postgres
   Plan:       nf-compute-20 (Free) 또는 가장 작은 거
   Version:    PostgreSQL 16
   Storage:    1 GB
   ```
3. Create → 1-2분 후 ready
4. **Connection details** 탭 열어두기:
   - **Internal connection URL** 복사 (네트워크 무료, 빠름)
     ```
     postgresql://nf_user:<pw>@primary.<addon-id>.<cluster>.local:5432/<db-name>
     ```
   - **External connection URL**도 따로 적어두기 (로컬에서 마이그레이션 돌릴 때 필요할 수 있음)

### 1-3. Combined Service (api) 생성

1. **+ Create new** → **Service** → **Combined Service**
2. **Source**:
   ```
   Repository:    StableHedge/stablehedge
   Branch:        main
   Build context: /              (모노레포 루트)
   Auto-deploy:   on push to main
   ```

3. **Build**:
   - **Build type**: Buildpack 우선 시도. 실패 시 Dockerfile 폴백 (다음 섹션 참고)
   - Buildpack이 인식하면 자동, 아니면 **Build command** 직접 입력:
     ```bash
     pnpm install --frozen-lockfile && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/xrpl-adapter build && pnpm --filter @stablehedge/api db:generate && pnpm --filter @stablehedge/api build
     ```
   - **Run command**:
     ```
     cd apps/api && pnpm start
     ```

4. **Resources**:
   - Plan: `nf-compute-20` (free, 256MB RAM / 0.1 vCPU)

5. **Networking → Public port**:
   ```
   Port:     3000
   Protocol: HTTP
   Public:   ✓
   ```
   → public URL 자동 발급: `https://api--stablehedge--<account>.code.run` 형태

6. **Health check**:
   ```
   Path:           /healthz
   Initial delay:  30s
   Period:         30s
   ```

### 1-4. Build 실패 시 — Dockerfile 폴백

Buildpack이 pnpm 모노레포 검출 실패하면 레포 루트에 다음 `Dockerfile` 추가하고 push:

```dockerfile
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/xrpl-adapter/package.json packages/xrpl-adapter/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @stablehedge/shared-types build && \
    pnpm --filter @stablehedge/xrpl-adapter build && \
    pnpm --filter @stablehedge/api db:generate && \
    pnpm --filter @stablehedge/api build

EXPOSE 3000
WORKDIR /app/apps/api
CMD ["pnpm", "start"]
```

서비스 설정에서 **Build type: Dockerfile**, **Dockerfile path: `/Dockerfile`** 지정.

### 1-5. 환경변수

Service → **Environment** 탭에 다음 추가 (key=value 형식):

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Postgres — 1-2단계에서 받은 internal URL
DATABASE_URL=postgresql://nf_user:<pw>@primary.<addon-id>.<cluster>.local:5432/<db-name>

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

# 새로 생성된 키 (별도 채팅 기록 또는 비밀 관리 도구에서 확인)
WALLET_ENCRYPTION_KEY=<openssl rand -hex 32 결과>
JWT_SECRET=<openssl rand -hex 32 결과>
```

→ Save → 자동 재배포 트리거됨.

### 1-6. Build 모니터링

**Builds** 탭에서 진행 상황 확인 (보통 3-5분).

빌드 성공 → **Deployments** 탭에서 새 deployment running 상태 확인.

### 1-7. 헬스체크

```bash
curl https://api--stablehedge--<account>.code.run/healthz
# → {"status":"ok","network":"testnet"}
```

빈 DB 상태에선 `/api/funds` 같은 엔드포인트가 빈 배열 반환.

### 1-8. 시드 1회 실행

#### 옵션 A: Northflank 대시보드의 컨테이너 Shell
- Service → **Console** (또는 **Shell**) 탭
- 컨테이너 안에서:
  ```bash
  cd apps/api
  pnpm db:seed
  pnpm scripts:open-trustlines
  ```

#### 옵션 B: Northflank CLI (로컬에서)
```bash
brew install northflank/tap/cli
northflank login
northflank exec service \
  --project stablehedge \
  --service api \
  -- bash -c "cd apps/api && pnpm db:seed && pnpm scripts:open-trustlines"
```

#### 옵션 C: 로컬에서 External URL로 직접 시드
```bash
DATABASE_URL=<external-url> pnpm --filter @stablehedge/api db:seed
DATABASE_URL=<external-url> pnpm --filter @stablehedge/api scripts:open-trustlines
```

---

## 2. Frontend: Vercel

### 2-1. 가입 및 프로젝트 import

1. https://vercel.com → **Sign in with GitHub**
2. **Add New** → **Project** → `StableHedge/stablehedge` Import

### 2-2. 프로젝트 설정

Vercel이 모노레포 자동 감지 → **Root Directory** 묻는 화면:
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js (자동)

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
NEXT_PUBLIC_API_BASE=https://api--stablehedge--<account>.code.run
```

### 2-4. Deploy

→ 2-3분 후 `https://stablehedge-<id>.vercel.app` 같은 도메인 발급.

### 2-5. 동작 확인

브라우저로 접속 → Overview 페이지에 펀드 목록·투자자 목록 보이면 성공.

안 보이면:
- Network 탭에서 API 호출 URL이 production URL인지 확인
- CORS 에러 시 → `apps/api/src/index.ts`의 cors 설정 확인 (`origin: true`라 OK여야 함)

---

## 3. 트러블슈팅

### Buildpack 실패: "package not found" 또는 "workspace dependency missing"
- pnpm workspace dependencies 빌드 순서가 중요
- 1-4의 Dockerfile 폴백 사용

### Postgres 연결 안 됨
- internal hostname (`*.local:5432`)인지 확인
- 같은 region·같은 project인지
- 비밀번호에 특수문자 있으면 URL encode

### Health check가 unhealthy
- `Initial delay`가 너무 짧으면 prisma migrate 진행 중에 fail
- `Initial delay: 60s` 정도로 늘려보기
- 빌드 로그에서 마이그레이션 정상 적용됐는지 확인

### `prisma migrate deploy` 실패
- migration 폴더(`apps/api/prisma/migrations`)가 푸시됐는지 확인
- `DATABASE_URL`이 정확한지

### CORS 에러
- API의 `apps/api/src/index.ts:30` → `cors({ origin: true })`로 와일드카드인지
- production에선 Vercel 도메인 명시 권장

---

## 4. KFIP 직전 체크리스트

```
□ Northflank Postgres addon Healthy
□ Northflank api service Running, /healthz 200 OK
□ DB 시드 완료 (Fund 1, Investor 3, Investment 3)
□ 투자자 trustlines 모두 ACTIVE
□ Treasury 지갑에 IOU 잔액 충분 (>1.5M USDX)
□ Vercel 프론트 → Overview 페이지에 펀드·투자자 보임
□ Distribution 생성 → Calculate → Submit 풀 시연 1회 성공
□ Settlement Monitor 화면 갱신 확인
□ Investor Statement 화면 갱신 확인
□ XRPL Explorer 링크 정상 작동
□ Production용 새 ISSUER/TREASURY 시드 발급 완료 (선택)
```

---

## 5. 운영 정보 기록

배포 후 채울 것:

| 항목 | 값 |
|---|---|
| Northflank project URL | `https://app.northflank.com/p/stablehedge` |
| Northflank api public URL | `https://api--stablehedge--<account>.code.run` |
| Postgres internal hostname | `primary.<addon-id>.<cluster>.local` |
| Postgres external hostname | (CLI 시드용) |
| Issuer address | (운영 시드에서) |
| Treasury address | (운영 시드에서) |
| Vercel deployment URL | `https://<...>.vercel.app` |
| 첫 시드 실행 일시 | |

---

## 6. 재배포·재시드 절차

```bash
# 1. 코드 변경 → push → Northflank 자동 재배포 (3-5분)
git push origin main

# 2. 데이터 손상·초기화가 필요한 경우만 시드 재실행
northflank exec service \
  --project stablehedge \
  --service api \
  -- bash -c "cd apps/api && pnpm db:seed"

# 3. Vercel은 main push 시 자동 재배포 — 도메인 변동 없음
```

---

## 7. 비용 및 한도

| 자원 | Sandbox 한도 | 우리 사용량 |
|---|---|---|
| Services | 2 | 1 (api) |
| Databases | 2 | 1 (postgres) |
| Cron jobs | 2 | 0 |
| Compute | nf-compute-20 (256MB / 0.1 vCPU) | 충분 |
| Storage | 1 GB postgres | 시드 ~1 MB |

KFIP 데모 + 데모 후 1-2개월 운영까지 **$0**로 가능.

한도 초과 시점:
- 트래픽 급증 (드물지만 가능)
- 데이터 1GB 넘어감 (현재 사용량으론 수백만 트랜잭션 후)
- 두 번째 service·DB 필요해짐

→ 그 시점에 paid plan 검토.
