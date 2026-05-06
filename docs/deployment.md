# Deployment Guide

현재 배포 전략은 `Frontend = Vercel`, `Backend = Render`, `DB = 임시 local/ephemeral` 기준이다.
이 구성은 KFIP 2026 데모를 빠르게 띄우기 위한 임시안이며, 우선순위는 `Render auto-deploy ON`으로 `main` push마다 자동 배포되게 만드는 것이다.

## 현재 결정

| 컴포넌트 | 호스팅 | 비용/특성 |
|---|---|---|
| Frontend (`apps/web`) | Vercel Hobby | 무료 |
| Backend API (`apps/api`) | Render Free Web Service | 무료, idle 시 spin down 가능 |
| DB | 임시 local/ephemeral | 재시작·redeploy 시 유실 가능 |

주의:
- Render Free는 idle 후 spin down 될 수 있다.
- Free web service의 로컬 파일시스템은 영속 스토리지가 아니다.
- 따라서 현재 DB는 운영용이 아니라 데모용 임시 상태로 취급한다.
- 추후 `Supabase Postgres`로 분리하는 것을 전제로 한다.

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
  pnpm install --frozen-lockfile && pnpm --filter @stablehedge/shared-types build && pnpm --filter @stablehedge/xrpl-adapter build && pnpm --filter @stablehedge/api db:generate && pnpm --filter @stablehedge/api build
  ```

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

현재 단계의 DB는 영속성보다 속도를 우선한다.

원칙:
- 데이터 유실 허용
- redeploy/restart 시 초기화 가능해야 함
- 중요한 상태는 seed로 재현 가능해야 함
- 데모 직전 시드 재투입 절차를 준비해 둔다

권장 절차:
1. 배포 후 `/healthz` 확인
2. DB migration 적용 확인
3. 시드 실행
4. trustline 개설 스크립트 실행
5. 데모 시나리오 smoke test

---

## 4. Seed / 복구

서비스 쉘 또는 외부 연결이 가능할 때 아래를 실행한다.

```bash
pnpm --filter @stablehedge/api db:seed
pnpm --filter @stablehedge/api scripts:open-trustlines
```

임시 DB가 비거나 깨졌을 때도 같은 절차로 복구한다.

---

## 5. 이후 목표: Serverless 분리

현재 Render 배포는 최종 구조가 아니다.
목표는 long-running 의존성을 줄이고 backend를 serverless에 가까운 shape로 나누는 것이다.

우선순위:
1. `ledger-watcher`의 필요성 재검증
2. watcher를 cron polling 또는 별도 worker로 분리
3. API 진입점을 `listen()` 서버에서 함수형 핸들러 친화 구조로 재구성
4. DB를 Supabase Postgres로 분리
5. 오래 걸리는 작업은 `submit 요청`과 `실제 처리`를 비동기 분리

이 과정을 거치면 최종적으로는:
- Web: Vercel
- Read-heavy API: serverless
- Long-running or async job: 별도 worker
- DB: Supabase

구조로 이동할 수 있다.

---

## 6. 현실적인 해석

현재 Render 선택은 아래 전제를 둔 임시안이다.

- 비용 0원 우선
- 데모용
- 일부 cold start 감수
- DB 영속성 미보장 감수
- 이후 Supabase 및 serverless 분리 예정

이 전제가 깨지면 다음 우선순위는 `DB 외부 분리`다.

---

## 7. 트러블슈팅

### 배포는 성공했는데 첫 응답이 느림

- Render Free cold start 가능성
- keep-alive cron이 누락됐는지 확인

### DB가 비어 있음

- restart 또는 redeploy로 임시 DB 상태 유실 가능
- seed 다시 실행

### `/submit` 이후 상태 반영이 애매함

- 현재는 long-running watcher 의존이 일부 있음
- 재현되면 watcher 의존 제거 또는 polling 대체를 우선 검토

### build 실패

- workspace 패키지 빌드 순서 확인
- `@stablehedge/shared-types`와 `@stablehedge/xrpl-adapter`가 먼저 build되어야 함
