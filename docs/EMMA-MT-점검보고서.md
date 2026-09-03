# 나눔플러스 문자후원(EMMA) 운영 점검 보고서 — 최종

작성일: 2026-09-03 · 범위: **점검·확인만** (운영/코드 변경 없음)
점검 대상: **운영 서버** `15.165.2.225` (Ubuntu 24.04, `/home/ubuntu/nanumplus`, `/home/ubuntu/EMMA3`)

---

## 0. 한 줄 요약

**문자후원은 2026-08-26부터 완전히 멈춰 있습니다.** MO(수신)도 MT(감사문자)도 안 됩니다.
원인은 두 개이고, 둘 다 **8/26 배포 때 코드만 바뀌고 서버 쪽이 따라가지 않은 것**입니다.

| | 증상 | 원인 | 확인 |
|---|---|---|---|
| **A** | MO 미처리 → 후원 0건 | 크론 인증 방식 변경 미반영 → 매분 HTTP 401 | 확정 |
| **B** | MT 발송 불능 + 로그 폭주 | 고아 시퀀스 2개 → `em_smt_tran` 생성 영구 실패 | 확정 |
| **A2** | 8/26~9/2 앱 크래시 루프 (EADDRINUSE) | 배포 시 기존 프로세스 미종료 → 무한 재시작 | 확정 (9/2 복구됨) |
| C | (B 해결 후에도) 감사문자 생략 | `INFOBANK_MT_SENDER_NUMBER=""` | 확정 |
| D | (B·C 해결 후) 큐 미픽업 가능성 | `emma_id` 불일치 — EMMA는 공백, 코드는 `'na'` | 확정 |

부수: **디스크 99% (여유 130MB)** — B가 만든 로그 폭주 때문. 방치 시 수일 내 서비스 정지.

---

## 1. 먼저, 최초 가설 정정

당초 "EMMA MT 프로세스가 꺼져 있다"는 지적은 **로컬 개발 사본 기준으로는 맞지만 운영에는 해당되지 않습니다.**

```
운영 /home/ubuntu/EMMA3/conf/emma.cf
  process.use.mtsender     = 1     ← 켜져 있음
  process.use.mtreceiver   = 1
  process.use.smtcollector = 1
  process.use.mtdistributor= 1
  process.use.smoreceiver  = 1
  process.use.modistributor= 1
```

DB도 EMMA(`db.cf`)와 앱(`.env`) 모두 `donation_platform` 으로 **일치**합니다.
EMMA 프로세스도 9/1부터 **정상 가동 중**입니다.
→ 켤 스위치가 없는 게 아니라, **켜져 있는데 초기화에서 죽고 있었습니다.**

---

## 2. 원인 A — MO 처리 중단 (HTTP 401)

### 사실
```
$ curl "http://127.0.0.1:3005/api/cron/emma-mo?secret=<.env의 값>"
HTTP 401  {"error":"Unauthorized"}

$ journalctl -u emma-mo-cron
  매분: Main process exited, code=exited, status=22   ← curl 22 = HTTP 4xx/5xx
```

### 원인
`/etc/systemd/system/emma-mo-cron.service`
```
ExecStart=/usr/bin/curl -sf -m 55 http://127.0.0.1:3005/api/cron/emma-mo?secret=${EMMA_CRON_SECRET}
```

`src/app/api/cron/emma-mo/route.ts` (커밋 `4ceecba`, **2026-08-26**)
```
// 시크릿은 Authorization 헤더로만 받는다.
// (?secret= 쿼리 방식은 액세스 로그·프록시 로그에 평문으로 남아 제거)
const authHeader = req.headers.get("authorization");
```

**보안 강화로 쿼리 파라미터 인증을 제거했는데 systemd 유닛은 그대로 쿼리로 호출합니다.**
→ 8/26 배포 시점부터 크론이 단 한 번도 성공하지 못했습니다.

### 근거 정합성
- 마지막 SMS 후원: `Donation` 최근 `donatedAt` = **2026-08-26 00:08:42** (누적 178건)
- 커밋 `4ceecba` 날짜 = **2026-08-26**
- 미처리 MO 잔류: `em_mo_log_202609` 2건, 둘 다 `msg_status='3'`(미처리)
  - `#2540` + `3838` → `#2540-3838` = 한국여성민우회 (기관 매핑 정상)
  - `#2540` + `1983` → `#2540-1983` = 한국여성의전화 (기관 매핑 정상)
  → **번호 매핑은 문제없고, 크론이 안 돌아 전환만 안 된 것**입니다.

### 영향
8/26 이후 들어온 문자후원이 **후원 내역에 잡히지 않았습니다.**
현재 DB에 남은 건 2건이지만, `em_mo_log_202608` 테이블이 사라졌으므로(원인 B 참조)
**8/26~8/31 사이 수신분은 복구 불가일 수 있습니다.** 인포뱅크 측 원장과 대조가 필요합니다.

---

## 3. 원인 B — MT 발송 불능 + 로그 폭주 (고아 시퀀스)

### 사실
```
donation_platform 의 EMMA 테이블 : em_banlist, em_mo_log_202609   ← 2개뿐
em_smt_tran  → relation does not exist
em_mmt_tran  → relation does not exist

잔존 시퀀스 : sq_em_smt_tran_01, sq_em_mmt_tran_01   ← 살아있음
저장 프로시저 : sp_em_* 43개 모두 정상 존재
```

### 원인 (EMMA 로그가 그대로 말해줌)
```
ERROR: relation "sq_em_smt_tran_01" already exists
  Where: SQL statement " CREATE SEQUENCE sq_em_smt_tran_01 INCREMENT BY 1 START WITH 1 "
  PL/pgSQL function sp_em_smt_create() line 71 at EXECUTE
    at ib.emma.worker.SMSMTCollector.initializeDB(SMSMTCollector.java:214)
    at ib.emma.worker.MTDistributor.initializeDB(MTDistributor.java:290)
    at ib.emma.worker.TranDeleter.initializeDB(TranDeleter.java:191)
```

EMMA는 기동 시 `em_smt_tran` 이 없으면 `sp_em_smt_create()` 로 재생성을 시도합니다.
그 프로시저 안에 `CREATE SEQUENCE sq_em_smt_tran_01` 이 들어 있는데,
**테이블은 지워졌지만 시퀀스는 남아 있어** 이 문장에서 프로시저 전체가 실패합니다.
→ 테이블이 영원히 만들어지지 않고, MT 계통 워커 3개가 **매분 초기화 실패를 반복**합니다.

발단은 `db:push` 입니다. README에 이미 경고가 있습니다 —
> `db:push` 는 Prisma 스키마에 없는 `em_*` 테이블을 모두 삭제합니다. `db:emma` 로 다시 설치하세요.

`db:push` 는 테이블만 지우고 **독립 시퀀스는 남깁니다.** 그 뒤 `db:emma` 를 재실행하지 않았습니다.
`em_mo_log_202608` 이 없는 것도 같은 이유이며, `em_mo_log_202609` 는 EMMA가 월초에 스스로 만든 것입니다.

### 파급 — 디스크
```
로그 증가:  8/31까지 하루 2KB → 9/1 156KB → 9/2 485KB → 9/3 하루만 7.9MB
에러 누적:  sq_em_smt_tran_01 already exists  5,801건 (오늘 하루)
디스크:     /dev/root 6.8G 중 6.6G 사용, 여유 130MB (99%)
```
**이 상태로 방치하면 며칠 내 디스크가 차서 DB 쓰기와 서비스가 정지합니다.**

---

## 3-2. [추가 발견] 앱 크래시 루프 — 같은 8/26 배포

### 사실
```
Error: listen EADDRINUSE: address already in use :::3005     93,527회
nanumplus.service: Scheduled restart job, restart counter is at 61562   (8/30 시점)
현재 가동 시작 : 2026-09-02 14:01:12 (이후 안정, NRestarts=685)
syslog 용량    : syslog 112M + syslog.1 147M = 259M (대부분 이 로그)
```

### 원인
배포 시 기존 Next 프로세스가 종료되지 않은 채 새 프로세스가 3005 포트를 잡으려다 실패.
systemd 가 5초 간격으로 무한 재시작 → 크래시 루프.

61,562회 × 5초 ≈ 85시간 을 역산하면 시작 시점이 **8/26~27** —
원인 A(크론 401), 원인 B(고아 시퀀스)와 **동일한 배포**입니다.

### 영향
- **8/26 ~ 9/2 약 일주일간 서비스가 사실상 불통**이었습니다.
  문자후원뿐 아니라 그 기간 전체 기능의 정상 동작 여부를 재검토해야 합니다.
- 9/2 14:01 재빌드로 앱은 살아났으나, A·B 는 그대로 남았습니다.

### 재발 방지 (권고)
`nanumplus.service` 에 재시작 제한이 없어 무한 루프에 빠졌습니다.
`StartLimitIntervalSec` / `StartLimitBurst` 를 두어 일정 횟수 실패 시 멈추도록 하고,
배포 스크립트에서 기존 프로세스 종료를 확인한 뒤 기동하도록 정비가 필요합니다.

---

## 3-3. 보안 — SSH 무차별 시도

`/var/log/btmp.1` 2.3MB (로그인 실패 기록 수만 건).
키 인증만 사용 중이라 즉시 위험은 낮으나, 보안 그룹에서 22번 포트를 특정 IP로 제한할 것을 권합니다.
이번 장애와는 별건.

## 4. 원인 C — 감사문자 발신번호 미설정

운영 `.env`
```
INFOBANK_MT_SENDER_NUMBER=""     ← 비어 있음
```

`mo-processor.ts` `sendThankYouMt()` 는 이 값이 비면 첫 줄에서 `return` 합니다.
```
if (!senderNumber) { console.log("[emma-mo] MT 발신 번호 미설정 → MT 발송 생략"); return; }
```
→ B를 고쳐 `em_smt_tran` 이 생겨도, 이 값이 비어 있는 한 감사문자는 **큐에 들어가지도 않습니다.**
(참고: 로컬 개발 `.env` 에는 `07041582540` 이 들어 있음)

---

## 5. 원인 D — emma_id 불일치

```
EMMA가 실제로 기록한 값 : em_mo_log_202609 의 emma_id = '  ' (공백, 2건)
코드가 넣는 값          : mt-sender.ts:33  EMMA_ID("nanum") → 앞 2자리 'na'
```
EMMA MTSender 는 자신의 `emma_id` 와 일치하는 큐 행만 집어갑니다.
→ B·C 를 고쳐도 이대로면 큐에 쌓이기만 하고 발송되지 않을 수 있습니다.

---

## 6. 관리자 화면이 이걸 못 잡아낸 이유

| 파일 | 보는 테이블 | 실제 |
|---|---|---|
| `api/admin/emma-diagnostic/route.ts` | `em_mt_log_YYYYMM` | 발송 큐는 `em_smt_tran` |
| `admin/settings/emma/page.tsx` | `em_mt_log_YYYYMM` | 〃 |
| `api/admin/emma-setup/route.ts` | `em_mt_log_YYYYMM` 생성 | EMMA가 읽지 않는 테이블 |

최고관리자 화면에서는 **MT 적체도, 테이블 부재도, 크론 401도 보이지 않습니다.**
8/26부터 일주일 넘게 멈춰 있었는데 아무도 몰랐던 구조적 이유입니다.

---

## 7. 기관별 MT on/off 스위치 — 현황

**존재하지 않습니다.**

| 위치 | 확인 |
|---|---|
| `schema.prisma` `model Organization` (115~148행) | 문자발송 관련 필드 **없음** |
| 스키마 전체 | 플랫폼 전역 설정 테이블 **없음** |
| `PATCH /api/admin/organizations/[id]` | 허용 필드에 없음 |
| `/admin/settings/emma` | 읽기 전용 상태 표시 + 크론 수동실행뿐 |
| 실제 제어 | 전역 env `INFOBANK_PROVIDER`, `INFOBANK_MT_SENDER_NUMBER` (재배포 필요) |
| 발신번호 | 전 기관 공용 1개 (현재는 그마저 빈 값) |

기관 A만 켜고 B는 빼는 운영은 현 구조로 불가능합니다.
운영 중인 기관은 **173개**(SMS 번호 배정 기관 다수)이므로, 스위치 없이 전역으로 켜면
**173개 기관 전체에 동시에 감사문자가 나가기 시작합니다.** 스위치가 먼저 필요한 실질적 이유입니다.

---

## 8. 조치 순서 (지시 대기 — 미실행)

### 긴급 (오늘)
1. **디스크 확보** — `truncate -s 0 /home/ubuntu/EMMA3/logs/emma.info.log` (즉시 8MB)
   ※ 원인 B를 고치지 않으면 다시 찹니다. 임시방편.
2. **원인 B 해소** — 고아 시퀀스 제거 후 EMMA 재기동.
   EMMA가 `sp_em_smt_create()` 로 테이블을 스스로 재생성합니다.
   또는 `npm run db:emma` 로 정식 재설치. **어느 쪽이든 실행 전 DB 백업 필수.**
3. **원인 A 해소** — systemd 유닛을 헤더 인증으로 교정
   (`curl -H "Authorization: Bearer $EMMA_CRON_SECRET"`), `daemon-reload` 후 재시작.
   → 잔류 MO 2건이 후원으로 전환되는지 확인.

### 그다음
4. `INFOBANK_MT_SENDER_NUMBER` 설정 (원인 C). **단, 4번을 켜기 전에 5번을 먼저 확인할 것.**
5. `emma_id` 정합 (원인 D) — EMMA 실제값이 공백이므로 코드/설정 중 어느 쪽을 맞출지 결정.
6. **감사문자를 켜기 직전 반드시 `em_smt_tran` 잔여분 확인.**
   과거 큐가 남아 있으면 켜는 순간 한꺼번에 발송됩니다.
7. 진단 화면을 `em_smt_tran` 기준으로 교정 (6항) — 안 고치면 켠 뒤에도 상태 확인 불가.

### 별건
- 8/26~8/31 유실 MO 건수 확인 및 인포뱅크 원장 대조.
- 운영에서 `db:push` 를 직접 실행하지 못하도록 절차 정비 (이번 사고의 근본 원인).
- 로컬 개발환경 복구 (PostgreSQL 비밀번호 불일치로 개발서버 기동 불가).

---

## 9. 기관별 스위치 설계 시 참고 (개발 지시 대기 중)

1. **2단 게이트** — 플랫폼 전역 마스터(최고관리자) → 기관별. 전역 OFF 면 기관 설정 무관 차단.
   기관 173개 규모이므로 **기본값은 OFF** 가 안전합니다.
2. **차단 지점은 `sendThankYouMt` 호출 이전.** 큐 적재 후에는 되돌릴 수 없습니다.
   `sendEmmaMt` 내부에도 안전장치를 두면 `infobank-live.sendMt` 경로까지 함께 막힙니다.
3. **저장 위치** — (a) `Organization` 에 필드 추가(단순, 기관별 발신번호도 함께) /
   (b) 별도 `OrgMessagingSetting` + 전역 `PlatformSetting`(향후 카톡·이메일 확장 시 유리).
4. **UI** — `/admin/organizations/[id]` 토글, 목록에 상태 컬럼(173개 일괄 파악용),
   `/admin/settings/emma` 에 전역 마스터.
5. **감사로그** — `AuditLog` 모델이 이미 있으므로 토글 변경 기록.
6. **선행 조건** — 8항 1~5가 끝나야 스위치 동작을 검증할 수 있습니다.
   지금 만들면 켜든 끄든 결과가 같아 테스트가 불가능합니다.

---

## 10. 복구 실행 기록 (2026-09-03)

### 완료
| 항목 | 조치 | 결과 |
|---|---|---|
| 디스크 | EMMA 로그 truncate, npm 캐시 정리, syslog/syslog.1 정리 | 130MB → **579MB** (92%) |
| 백업 | `pg_dump donation_platform` | `/home/ubuntu/donation_platform_20260903.sql.gz` (103KB, COPY 24개 검증) |
| **원인 A** | `emma-mo-cron.service` ExecStart 를 `Authorization: Bearer` 헤더 방식으로 교정<br>원본 백업: `/root/emma-mo-cron.service.bak` | HTTP 200, 잔류 MO 2건 `created`<br>매분 `status=0/SUCCESS` |
| **원인 B** | 고아 시퀀스 `sq_em_smt_tran_01`·`sq_em_mmt_tran_01` DROP | EMMA 가 재기동 없이 자가 복구<br>`em_smt_tran`·`em_smt_client`·`em_mmt_tran`·`em_mmt_client`·`em_mmt_file` 생성<br>워커 3개 정상 초기화, 에러 루프 종료 |

### 미실행 (의도적 보류)
| 항목 | 이유 |
|---|---|
| 원인 C (`INFOBANK_MT_SENDER_NUMBER`) | 설정 즉시 **173개 기관 후원자에게 실제 문자 발송 시작**. 되돌릴 수 없음 |
| 원인 D (`emma_id` 정합) | 위와 동일 |
| 기관별 MT 스위치 개발 | 별도 지시 대기 |

**현재 상태: MO 수신·후원 전환은 정상 복구. MT 발송 경로는 준비됐으나 발신번호가 비어 있어 실제 발송은 일어나지 않음(안전).**
