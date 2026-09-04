# 온정(溫情) · 사회복지기관 후원금 모금 SaaS

문자후원(#2540)·간편 계좌이체·정기후원을 한 곳에서 관리하는 멀티 기관 후원 플랫폼입니다.
최고 관리자와 기관 관리자 권한이 분리되어 있으며, QR 후원·크라우드 캠페인·통계·캘린더를 제공합니다.

## 기술 스택
- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Prisma · PostgreSQL
- NextAuth (Credentials, JWT) · 역할 기반 접근 제어(RBAC)
- Recharts · lucide-react · qrcode

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 을 복사해 `.env` 를 만들고 값을 채웁니다.
```bash
cp .env.example .env
```
최소한 아래 두 값이 필요합니다. (기동 시 `src/lib/env.ts` 가 검증하며, 누락되면 서버가 뜨지 않습니다.)
- `DATABASE_URL` : PostgreSQL 접속 문자열
- `NEXTAUTH_SECRET` : 임의의 시크릿 (예: `openssl rand -base64 32`)

운영(`APP_ENV=production` 또는 `NODE_ENV=production`)에서는 추가로 아래 값이 필수입니다.
- `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `ONGI_PROVIDER=live` 인 경우 `ONGI_CALLBACK_SECRET`, `ONGI_QR_CODE`
- `INFOBANK_PROVIDER=live` 인 경우 `EMMA_ID`

> **mock 결제 차단**: `/api/donations/{transfer,recurring,card}/init` 는 인증이 없는 공개 API 입니다.
> mock 어댑터는 결제 없이 즉시 완료(COMPLETED) 후원을 만들 수 있으므로,
> `APP_ENV` 가 `local` / `development` 일 때만 동작하고 그 외 환경에서는 503 으로 차단됩니다.
> 로컬에서 mock 으로 테스트하려면 `.env` 에 `APP_ENV=local` 을 넣으세요.

> **프록시 단 수**: 로그인 실패 제한 등은 `X-Forwarded-For` 의 **마지막 홉**을 클라이언트 IP 로 씁니다.
> 앞단 프록시가 2단 이상이면 `TRUSTED_PROXY_HOPS` 를 그 수만큼 설정하세요. (기본 1)

문자후원/온기 연동은 기본값이 **mock** 이며, `.env` 의 `INFOBANK_PROVIDER`, `ONKI_PROVIDER` 를 `live` 로 바꾸고 키를 넣으면 실연동 어댑터로 교체할 수 있습니다.

### 3. 데이터베이스 스키마 적용 & 시드
```bash
npm run db:push      # 스키마를 DB에 반영
npm run db:seed      # 데모 데이터(기관 6·후원자 60·후원 200여 건·캠페인 12) 생성
npm run db:emma      # EMMA(인포뱅크) SP·테이블 설치 — db:push 후 반드시 재실행
```

> **주의:** `db:push` 는 Prisma 스키마에 없는 `em_*` 테이블을 모두 삭제합니다.
> `db:push` 를 실행했다면 `npm run db:emma` 로 EMMA 테이블을 다시 설치하세요.
> EMMA 연동 활성화는 `.env` 의 `INFOBANK_PROVIDER=live` + `EMMA_ID` 설정,
> MO 수신 처리는 `/api/cron/emma-mo` 를 주기 호출(1분 권장)하면 됩니다.

### 4. 개발 서버 실행
```bash
npm run dev
```
`http://localhost:3005` 접속.

### 5. 관리자 계정으로 로그인이 안 될 때
아래 명령으로 테스트 관리자 계정을 생성·복구할 수 있습니다. (여러 번 실행해도 안전)

**비밀번호는 저장소에 두지 않습니다. 실행할 때 환경변수로 주입하세요.**

```bash
# bash
ADMIN_INITIAL_PASSWORD='원하는비밀번호' ORG_ADMIN_INITIAL_PASSWORD='원하는비밀번호' npm run db:init-admin
```
```powershell
# PowerShell
$env:ADMIN_INITIAL_PASSWORD="원하는비밀번호"; $env:ORG_ADMIN_INITIAL_PASSWORD="원하는비밀번호"; npm run db:init-admin
```

비밀번호 재설정, 비활성/삭제 상태 복구, 기관관리자의 소속 기관 매핑까지 함께 처리하고
현재 DB에 존재하는 최고관리자 계정 목록을 출력합니다.
기관관리자 계정은 `passwordChangeRequired=true` 로 만들어져 **첫 로그인 후 비밀번호 변경이 강제**됩니다.

> 로그인 실패의 가장 흔한 원인은 **PostgreSQL 미실행**입니다.
> `Can't reach database server at localhost:5432` 가 보이면 DB 서비스부터 확인하세요.

## 계정 · 비밀번호 정책

- 저장소에는 **평문 비밀번호를 두지 않습니다.** 계정 생성/초기화 스크립트는 모두 환경변수로 값을 받습니다.

| 스크립트 | 환경변수 |
| --- | --- |
| `npm run db:init-admin` (`prisma/init-admin.ts`) | `ADMIN_INITIAL_PASSWORD`, `ORG_ADMIN_INITIAL_PASSWORD`(생략 시 앞 값 사용) |
| `prisma/create-org-admins.ts` (전 기관 일괄 발급) | `ADMIN_INITIAL_PASSWORD` |
| `prisma/ensure-admin.ts` | `ADMIN_INITIAL_PASSWORD` (미설정 시 1회용 임의 비밀번호 생성·출력) |
| `npm run db:seed` (`prisma/seed.ts`) | `SEED_ADMIN_PASSWORD`, `SEED_ORG_PASSWORD` (미설정 시 임의 생성·출력) |
| `prisma/check-passwords.ts` | `PASSWORD_CANDIDATES` (쉼표 구분) |
| `prisma/verify-org-admins.ts` | `ADMIN_INITIAL_PASSWORD` |

- 데모 계정 이메일: `admin@onjung.kr`(최고 관리자), `manager1~6@onjung.kr`(기관 관리자).
  비밀번호는 위 스크립트를 실행한 사람만 알 수 있습니다.
- **강제 변경**: 관리자가 심어준 초기 비밀번호(`init-admin`, `create-org-admins`, 최고관리자의 비밀번호 초기화)는
  `User.passwordChangeRequired = true` 로 표시되고, 해당 계정은 로그인 후 `/org/settings` 이외의 화면·API 로 갈 수 없습니다.
- **토큰 무효화**: 비밀번호 변경·초기화·로그아웃 시 `User.tokenVersion` 이 1 증가하며,
  이미 발급된 JWT 는 즉시 무효가 됩니다(재로그인 필요).
- 두 컬럼은 `prisma/sync-prod-20260904-auth-hardening.sql` 로 실서버에 반영합니다.

## 주요 경로
- `/` 메인 랜딩
- `/login` 로그인 (역할에 따라 자동 분기)
- `/admin/*` 최고 관리자 (기관/문자번호/QR/전체 후원/감사로그/통계)
- `/org/*` 기관 관리자 (본인 기관 대시보드/후원/후원자/캠페인/QR/캘린더)
- `/donate/[기관slug]` QR 후원 랜딩 (문자/계좌이체/정기후원)
- `/campaigns`, `/campaigns/[캠페인slug]` 공개 캠페인

## 연동 어댑터
- `src/lib/adapters/` 에 인터페이스와 Mock 구현이 있습니다.
  - `InfobankSmsDonationAdapter` (문자후원)
  - `OnkiTransferAdapter` (간편 계좌이체 / 정기후원)
- 실연동 시 동일 인터페이스로 `*-live.ts` 를 구현하고 팩토리(`index.ts`)에서 분기하면 됩니다.
- 결과 통지는 `/api/webhooks/infobank`, `/api/webhooks/onki` 웹훅에서 서명 검증 후 처리합니다.

## 보안 · 운영
- 모든 `/admin`, `/org` 경로는 미들웨어로 인증·권한을 강제합니다.
  API 경로(`/api/admin/*`, `/api/org/*`)는 리다이렉트 대신 **401/403 JSON** 을 반환합니다.
- 기관 관리자는 본인 기관 데이터만 접근(서버 쿼리 단에서 `organizationId` 스코프 고정).
- 후원자 연락처·이메일은 목록/CSV에서 마스킹됩니다.
  공개 후원 페이지(`/donate/[slug]`, `/donate/[slug]/messages`)의 문자후원 발신번호는
  **서버에서 마스킹한 값만** 클라이언트로 내려갑니다(RSC 페이로드에 원문이 실리지 않음).
- 주요 작업은 감사 로그(`AuditLog`)에 기록, 삭제는 soft delete.
  정산계좌 변경은 별도 액션 `ORGANIZATION_BANK_ACCOUNT_CHANGE` 로 변경 전/후를 함께 남깁니다.
- 온기(ONGI) 결제 콜백은 HMAC 서명(`ONGI_CALLBACK_SECRET`) 검증 + **금액 일치 확인**을 통과해야 승인됩니다.
  금액이 다르면 승인하지 않고 보류 메모만 남깁니다.
- 응답에 보안 헤더(CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, HSTS)를 적용합니다. (`next.config.mjs`)
- 후원 일시 집계는 한국 표준시(KST) 기준.
