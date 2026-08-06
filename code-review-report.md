# 나눔플러스 코드 점검 보고서

> 점검일: 2026-08-06  
> 점검자: Claude (Cowork)  
> 코드 수정 없음 — 보고 전용

---

## 1. 프로젝트 개요

### 기술 스택

| 구분 | 내용 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript 5.6 |
| DB | PostgreSQL + Prisma ORM 5.20 |
| 인증 | NextAuth v4 (JWT 세션, Credentials + OAuth) |
| 스타일 | Tailwind CSS 3.4 |
| 차트 | Recharts |
| SMS | 인포뱅크 EMMA (온프레미스 PostgreSQL 에이전트) |
| 결제 | 온기(Onki) 간편 계좌이체 / 정기후원 |

### 규모

- **소스 파일**: 160개
- **총 코드 라인**: 약 15,160줄
- **API 라우트**: 43개 (admin 24, org 12, public 3, webhook 3, cron 1)
- **Prisma 모델**: 14개

### 핵심 기능

1. 문자후원(SMS) — 인포뱅크 EMMA MO 폴링 + MT 감사문자
2. 간편 계좌이체 후원 / 정기후원 — 온기 연동
3. 기관별 캠페인 관리
4. 월별 정산 생성 및 채널별 수수료 적용
5. QR코드 발급
6. 후원자 관리 및 CSV 내보내기
7. 감사 로그 (AuditLog)
8. 최고관리자/기관관리자 RBAC

---

## 2. 발견된 문제 — 심각도별 분류

### ⛔ Critical

#### C-1. 의존성 알려진 취약점 (CRITICAL 2건, HIGH 4건)
`npm audit` 결과:

| 패키지 | 심각도 | 주요 CVE |
|--------|--------|----------|
| `next-auth` | Critical | Auth.js Bearer 헤더 예외, 이메일 유니코드 homoglyph 우회, OAuth state/nonce 쿠키 공급자 바인딩 결여 |
| `@auth/core` | Critical | 위 동일 |
| `next` 14.2.15 | High | DoS(Image Optimizer, Server Actions), HTTP Request Smuggling, SSRF(rewrites/Server Actions), CSP nonce XSS, cache poisoning 등 20건 이상 |
| `xlsx` 0.18.5 | High | Prototype Pollution, ReDoS |
| `@auth/prisma-adapter` | High | `@auth/core` 연쇄 |
| `postcss` | High | XSS, 경로 탐색 |

**위험**: next-auth의 이메일 homoglyph 우회는 인증 우회로 이어질 수 있습니다.  
**조치**: `next`, `next-auth`, `xlsx`를 최신 버전으로 업그레이드해야 합니다.

---

#### C-2. `INFOBANK_WEBHOOK_SECRET`이 빈 문자열 → 실 운영 시 웹훅 전면 차단
`.env`에 `INFOBANK_WEBHOOK_SECRET=""`으로 설정된 상태입니다.  
`infobank-live.ts`와 `infobank-mock.ts` 모두 시크릿이 비어 있으면 `verifyWebhookSignature`가 `false`를 반환합니다(`fail-closed`).  
**결과**: `INFOBANK_PROVIDER=live`로 전환해도 인포뱅크가 보내는 MO 웹훅이 전부 401 거부되어 SMS 후원 처리가 전혀 이루어지지 않습니다.

```
// src/lib/adapters/infobank-live.ts
if (!secret) return false; // secret = "" → false
```

---

#### C-3. MT 콜백 엔드포인트 — 인증·서명 검증 없음
`src/app/api/webhooks/infobank/mt-callback/route.ts`는 누구나 POST 요청이 가능합니다. 현재는 WebhookEvent만 저장하므로 직접적인 데이터 변조 위험은 낮지만, 추후 재발송 로직이 추가될 경우 무인증 트리거가 될 수 있습니다.

---

#### C-4. `NEXTAUTH_SECRET` 취약
`.env`에 `NEXTAUTH_SECRET="nanumplus-secret-key"` — 짧고 예측 가능한 평문 문자열입니다. JWT 위변조 리스크가 있습니다. 프로덕션 배포 전 반드시 `openssl rand -base64 32`로 교체해야 합니다.

---

### 🔴 Major

#### M-1. `EMMA_CRON_SECRET`이 빈 문자열 → 크론 엔드포인트 무방비
`/api/cron/emma-mo`는 `EMMA_CRON_SECRET`이 설정되어 있을 때만 검증합니다.  
`.env`에 `EMMA_CRON_SECRET=""`이므로 인증을 완전히 건너뜁니다. 외부에서 이 URL을 알면 누구나 MO 처리를 트리거할 수 있습니다.

```ts
// route.ts
if (cronSecret) { /* 검증 */ }
// cronSecret = "" → falsy → 검증 생략
```

---

#### M-2. `next.config.mjs` — 이미지 원격 패턴 와일드카드
```js
images: { remotePatterns: [{ protocol: "https", hostname: "**" }] }
```
모든 외부 HTTPS 도메인에서 이미지를 로드할 수 있습니다. Next.js Image Optimizer DoS 취약점(C-1 `next` High)과 결합되면 공격 면적이 넓어집니다. 실제 사용하는 도메인(Unsplash, 기관 CDN 등)만 명시해야 합니다.

---

#### M-3. 관리자 신규 등록 폼 — 비밀번호 필드가 `type="text"`
`src/components/admin/new-organization-form.tsx` 137번 줄:
```tsx
<input type="text" required minLength={8} value={form.adminPassword} ...
```
초기 비밀번호가 화면에 평문으로 표시되고, 브라우저 자동완성도 비밀번호로 저장되지 않습니다. `type="password"`여야 합니다.

---

#### M-4. `Campaign.currentAmount` 불일치 위험
SMS 채널 후원(`/api/webhooks/infobank/route.ts`)은 후원 완료 시 `Campaign.currentAmount`를 증가시키지 않습니다. 반면 계좌이체·정기후원은 증가시킵니다. 따라서 SMS 후원이 포함된 캠페인의 모금액 표시가 실제보다 낮게 나타납니다.

---

#### M-5. 캠페인 slug 생성 — TOCTOU Race Condition
`src/app/api/org/campaigns/route.ts`:
```ts
for (let i = 1; await prisma.campaign.findUnique({ where: { slug } }); i++) {
  slug = `${base}-${i}`;
}
// ← 여기서 다른 요청이 같은 slug로 먼저 create하면 unique 제약 위반 오류 발생
const campaign = await prisma.campaign.create({ data: { slug, ... } });
```
동시 생성 요청이 들어오면 Prisma unique 오류가 터집니다. 루프도 비효율적입니다(N번의 SELECT).

---

#### M-6. 신규 정산 생성(`generateSettlements`) — 트랜잭션 미적용
`services/settlement.ts` 기존 정산이 없을 때(`!existing`) `prisma.settlement.create()`를 호출하는 블록이 트랜잭션 밖에 있습니다. 서버가 Settlement 생성 직후 SettlementItem 연결 중 크래시하면 금액이 불일치할 수 있습니다.  
(※ 기존 정산에 추가하는 경우는 `$transaction`으로 묶여 있어 양호)

---

#### M-7. In-memory Rate Limiter — 멀티 프로세스·재시작 취약
`src/lib/rate-limit.ts`가 `Map`을 사용합니다. 서버 재시작 시 초기화되고, 여러 워커 인스턴스(PM2 클러스터, Docker 복수 컨테이너)에서는 인스턴스 간 공유가 안 됩니다. 실제 운영 시 Redis 기반 limiter로 교체해야 합니다.

---

#### M-8. `donation-raw-query.ts` — `take`/`skip`이 SQL에 문자열 직접 삽입
```ts
' ORDER BY d."donatedAt" DESC LIMIT ' + take + ' OFFSET ' + skip
```
호출 측(`admin/donations/page.tsx`)에서 `take`는 상수 `20`, `skip`은 `(page-1)*take`로 계산하여 숫자형이므로 현재는 안전합니다. 그러나 향후 다른 호출자가 문자열을 넘기면 SQL Injection이 됩니다. `$queryRaw` 태그드 템플릿이나 명시적 `parseInt` 후 `$queryRawUnsafe`로 전달해야 합니다.

---

### 🟡 Minor

#### N-1. `(prisma as any).settlement` / `(prisma as any).organizationFee` 광범위 사용
`prisma generate`를 다시 실행하지 않아 타입이 최신 스키마를 반영하지 못하고 있습니다. `as any` 캐스팅이 8개 파일에 산재합니다. `npx prisma generate` 후 `as any` 제거가 필요합니다.

---

#### N-2. 다수의 API 라우트에 전역 try-catch 없음
아래 라우트는 최상위 try-catch 없이 Prisma 예외가 그대로 Next.js 기본 500 핸들러로 전달됩니다. DB 접속 오류 등 예상치 못한 예외 시 에러 정보가 로그에 기록되지 않습니다.

- `/api/admin/calendar`, `/api/admin/donations`, `/api/admin/settlements/generate`, `/api/org/dashboard`, `/api/org/calendar`, `/api/org/donations`, `/api/org/donors/export`, `/api/org/reports`, `/api/public/campaigns/[slug]`, `/api/public/organizations/[slug]`

---

#### N-3. `emma-diagnostic` API — `emma-setup` API 세션 체크 방식 불일치
```ts
// emma-diagnostic/route.ts
if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") { ... }
```
`(session.user as any).role`을 사용하는 반면 다른 모든 Admin API는 `apiAuth("SUPER_ADMIN")`을 통해 일관되게 처리합니다. `as any` 캐스팅 + 직접 role 체크 방식이 섞여 있어 유지보수 시 누락 위험이 있습니다.

---

#### N-4. `<img>` 태그 직접 사용 — Next.js `Image` 컴포넌트 미사용
아래 파일에서 `next/image` 대신 `<img>`를 직접 사용합니다:
- `src/app/admin/organizations/page.tsx`
- `src/app/campaigns/[campaignSlug]/page.tsx`
- `src/app/donate/[organizationSlug]/page.tsx`
- `src/components/donation/campaign-card.tsx` (2곳)

이미지 최적화(WebP 변환, lazy loading, 크기 최적화)가 적용되지 않아 페이지 로드 성능이 저하됩니다.

---

#### N-5. `label`과 `input`의 `htmlFor`/`id` 연결 미적용
`new-organization-form.tsx`, `org-edit-delete.tsx`, `admin-settlement-client.tsx` 등에서 `<label>` 텍스트는 있지만 `for`/`id` 연결이 없습니다. 스크린 리더가 레이블을 입력 필드와 연관 지을 수 없어 접근성이 떨어집니다.

---

#### N-6. SMS MO 처리에서 `recipientNumber` 저장 시 불필요한 raw SQL
```ts
// mo-processor.ts
await prisma.$executeRawUnsafe(
  `UPDATE "Donation" SET "recipientNumber" = $1 WHERE id = $2`,
  normalizedRecipient, created.id
);
```
`recipientNumber`가 Prisma 스키마에 이미 정의된 컬럼이므로 `prisma.donation.update()`로 처리 가능합니다. `prisma generate` 미실행으로 인해 raw SQL을 사용하는 것으로 보입니다.

---

#### N-7. `Hero Slider` — 외부 Unsplash 이미지 하드코딩
```ts
image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&..."
```
배너 이미지가 코드에 직접 박혀 있습니다. Unsplash 서비스 장애 시 배너가 깨지고, 변경 시 코드 배포가 필요합니다.

---

#### N-8. `EMMA_DB_URL` 평문 노출 (진단 API 응답)
`/api/admin/emma-diagnostic` 응답에 `emmaDbUrl: "설정됨 (별도 DB)"` 수준으로 마스킹하지만, `allDatabases` 목록과 EMMA 테이블 구조가 응답에 포함됩니다. SUPER_ADMIN 전용 API이나 DB 내부 구조 노출은 최소화가 좋습니다.

---

#### N-9. `getActiveCampaignProgress` — 대시보드 오류 시 빈 배열 fallback 무음 처리
```ts
getActiveCampaignProgress(scope, 5).catch(() => [] as ...)
```
실패 시 빈 배열을 반환하고 오류가 기록되지 않습니다.

---

## 3. 잘 된 부분

- **RBAC 설계가 체계적**: `middleware.ts`로 라우트 보호, `apiAuth()` / `requireSuperAdmin()` / `requireOrgAdmin()`로 역할 분리가 명확합니다.
- **기관 데이터 스코프 격리**: `orgScope()` 함수로 ORG_ADMIN이 타 기관 데이터에 접근하는 것을 일관되게 차단합니다.
- **로그인 Rate Limiting**: IP당 10분 10회 실패 잠금이 구현되어 있습니다.
- **웹훅 서명 검증**: HMAC-SHA256 + `timingSafeEqual`을 사용해 타이밍 공격을 방어합니다.
- **온키 웹훅 트랜잭션**: `onki/route.ts`에서 이중 가산 방지를 `updateMany + count` 패턴으로 처리하고, 환불 시 모금액 차감도 트랜잭션으로 묶어 처리합니다.
- **캠페인 `currentAmount` 환불 처리**: `COMPLETED → REFUNDED` 시 `decrement` 처리가 구현되어 있습니다.
- **EMMA MO 원자적 선점**: `claimMoForProcessing()`이 CAS(Compare-And-Swap) 방식으로 중복 처리를 방지합니다.
- **EMMA 고착 복구**: `updated_at` 컬럼을 추가해 5분 이상 `PROCESSING` 상태인 레코드를 복구합니다.
- **정산 데이터 무결성**: 기존 정산에 항목 추가 시 `$transaction`으로 금액·항목을 원자적으로 처리합니다.
- **감사 로그**: 주요 관리자 액션(기관 생성/수정, QR 재발급, 비밀번호 초기화, 후원자 내보내기 등)에 AuditLog를 기록합니다.
- **개인정보 마스킹**: CSV 내보내기 시 전화번호·이메일을 `maskPhone` / `maskEmail`로 마스킹합니다.
- **삭제된·비활성 기관 차단**: `isOrgUsable()` 체크로 로그인된 ORG_ADMIN이더라도 비활성화된 기관의 API 접근을 차단합니다.
- **Zod 입력 검증**: 공개 후원 API 전체에 Zod 스키마 검증이 적용되어 있습니다.
- **`sanitizeText` / `sanitizeSlug`**: 저장 전 HTML 태그와 제어 문자를 제거합니다.
- **KST 날짜 처리**: `kst-date.ts`에서 KST ↔ UTC 변환을 한 곳에서 일관되게 처리합니다.
- **`.gitignore` 관리**: `.env`, `cert/`, `prisma/org-admin-*.txt`, `EMMA3/` 등이 올바르게 제외되어 있습니다.

---

## 4. 수정 우선순위

### P0 — 프로덕션 배포 전 반드시 해결

| # | 문제 | 참조 |
|---|------|------|
| 1 | `NEXTAUTH_SECRET`을 강력한 랜덤 값으로 교체 | C-4 |
| 2 | `INFOBANK_WEBHOOK_SECRET` 설정 (비어있으면 SMS 후원 전면 불작동) | C-2 |
| 3 | `EMMA_CRON_SECRET` 설정 (빈 문자열이면 무인증) | M-1 |
| 4 | `npm update next next-auth @auth/core` (Critical/High CVE 해소) | C-1 |

### P1 — 기능 정확성 / 데이터 무결성

| # | 문제 | 참조 |
|---|------|------|
| 5 | SMS 후원도 캠페인 `currentAmount` 업데이트하도록 수정 | M-4 |
| 6 | 캠페인 slug 생성을 `upsert` + DB unique 제약으로 안전하게 교체 | M-5 |
| 7 | 신규 정산 생성 블록을 `$transaction`으로 래핑 | M-6 |
| 8 | MT 콜백에 서명 검증 추가 (또는 엔드포인트 삭제) | C-3 |

### P2 — 보안·코드 품질

| # | 문제 | 참조 |
|---|------|------|
| 9 | `next.config.mjs` remotePatterns를 특정 도메인으로 제한 | M-2 |
| 10 | 초기 비밀번호 필드 `type="password"`로 변경 | M-3 |
| 11 | `donation-raw-query.ts` LIMIT/OFFSET을 파라미터화 | M-8 |
| 12 | `npx prisma generate` 실행 후 `as any` 캐스팅 제거 | N-1 |
| 13 | API 라우트에 전역 try-catch + 에러 로깅 추가 | N-2 |
| 14 | `emma-diagnostic` / `emma-setup` → `apiAuth("SUPER_ADMIN")`으로 통일 | N-3 |

### P3 — 개선 권고

| # | 문제 | 참조 |
|---|------|------|
| 15 | `<img>` → `next/image` 교체 | N-4 |
| 16 | `<label htmlFor>` + `<input id>` 연결로 접근성 개선 | N-5 |
| 17 | In-memory rate limiter → Redis(Upstash) 교체 | M-7 |
| 18 | `recipientNumber` 저장을 Prisma ORM으로 전환 | N-6 |
| 19 | Hero Slider 이미지를 DB 또는 환경변수로 외부화 | N-7 |
| 20 | `xlsx` 최신 패키지(ExcelJS 등)로 교체 | C-1 일부 |

---

## 5. 종합 평가

**전반적으로 구조가 탄탄한 프로젝트입니다.**  
RBAC·데이터 스코프·웹훅 서명·트랜잭션·감사 로그 등 핵심 보안·무결성 요소를 의식하고 구현한 흔적이 뚜렷합니다.

다만 **현재 상태로 프로덕션에 투입하기에는 P0 항목이 장애물**입니다.

- `NEXTAUTH_SECRET`이 취약하고, `INFOBANK_WEBHOOK_SECRET`이 비어있어 SMS 후원이 아예 동작하지 않습니다.
- `next`, `next-auth`가 알려진 CRITICAL CVE를 포함한 오래된 버전입니다.

P0 4건을 해결하고 P1 4건을 보완하면 운영 가능한 수준이 됩니다.  
`as any` 남용(32건)과 `prisma generate` 미갱신은 기술 부채이지만 기능에는 직접 영향이 없습니다.  
접근성(label/id)과 이미지 최적화(next/image)는 서비스 품질 개선 차원에서 순차적으로 대응하면 됩니다.
