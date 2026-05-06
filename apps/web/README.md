# StableHedge Web (Frontend)

이 폴더는 프론트엔드 팀의 진입점이다. 이번 1주 스프린트에서는 **백엔드만** 구현했다.

## 백엔드와 붙는 방법

- API base URL: `http://localhost:3000/api`
- Figma 3개 화면에 대응되는 API:
  - **Deal Distribution Dashboard** → `GET /api/distributions/:id`, `POST /api/distributions/:id/calculate`, `POST /api/distributions/:id/submit`
  - **XRPL Settlement Monitor** → `GET /api/settlement-monitor/funds/:fundId?page=1&pageSize=5`
  - **Investor Statement** → `GET /api/investors/:investorId/statements?period=Q1-2026`
- 응답 DTO 타입은 `packages/shared-types`에 정의되어 있다. import해서 쓰면 된다.

## 권장 셋업

```bash
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
pnpm add @stablehedge/shared-types@workspace:*
```
