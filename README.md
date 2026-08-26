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
최소한 아래 두 값이 필요합니다.
- `DATABASE_URL` : PostgreSQL 접속 문자열
- `NEXTAUTH_SECRET` : 임의의 시크릿 (예: `openssl rand -base64 32`)

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
```bash
npm run db:init-admin
```
비밀번호 재설정, 비활성/삭제 상태 복구, 기관관리자의 소속 기관 매핑까지 함께 처리하고
현재 DB에 존재하는 최고관리자 계정 목록을 출력합니다.

> 로그인 실패의 가장 흔한 원인은 **PostgreSQL 미실행**입니다.
> `Can't reach database server at localhost:5432` 가 보이면 DB 서비스부터 확인하세요.

## 데모 계정
| 구분 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 최고 관리자 | `admin@onjung.kr` | `admin1234` |
| 기관 관리자 (따뜻한손길복지재단) | `manager1@onjung.kr` | `org1234` |
| 기관 관리자 (푸른희망아동센터) | `manager2@onjung.kr` | `org1234` |
| 기관 관리자 (한울타리노인복지회) | `manager3@onjung.kr` | `org1234` |

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
- 기관 관리자는 본인 기관 데이터만 접근(서버 쿼리 단에서 `organizationId` 스코프 고정).
- 후원자 연락처·이메일은 목록/CSV에서 마스킹됩니다.
- 주요 작업은 감사 로그(`AuditLog`)에 기록, 삭제는 soft delete.
- 후원 일시 집계는 한국 표준시(KST) 기준.
