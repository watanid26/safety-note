# 중대재해 점검노트

중대재해처벌법 시행령이 **반기 1회 이상 점검**하라고 정한 항목을 할 일로 만들고,
체크 · 증빙 · 개선 조치를 모아 **경영책임자 확인이 담긴 보고서**로 남기는 웹 앱이다.
관련 법령이 바뀌면 다시 확인할 항목을 표시한다 (법령 데이터는 LawChange 가 수집한 것을 재사용).

만든 이유: 법이 정한 반기 점검을 엑셀·메일로 챙길 때 생기는 마감 누락, 흩어진 증빙, 담당자 인수인계 문제를
"할 일 → 증빙 → 확인 → 잠금 → 보관" 흐름으로 풀어 보고, Next.js 서버 액션 · Drizzle · Supabase 를 실제 업무 흐름에 적용해 보기 위해.

- 하지 않는 일: 법률 자문, 현장 점검, "처벌받지 않는다"는 보장

## 기술 스택

Next.js 14 (App Router, 서버 액션) · TypeScript · Drizzle ORM · PostgreSQL(Supabase) · Supabase Auth/Storage · Tailwind CSS · Vitest · docx/exceljs 문서 생성 · Vercel Cron

## 무엇이 들어 있나

| 화면 / 기능 | 경로 |
|---|---|
| 소개 화면 | `/` |
| 반기 점검표 엑셀 다운로드 | `/api/free-checklist` |
| 이메일 로그인 (Supabase 매직 링크) | `/login` |
| 회사 등록 → 이번 반기 점검 자동 생성 | `/app/onboarding` |
| 반기 점검 화면 (진행률, 법령 변경 경고, 지난 반기 미완료 조치) | `/app/periods/[id]` |
| 항목 상세 (결과, 메모, 파일·링크·메모 증빙, 개선 조치, 관련 법령 변경, 기록) | `/app/items/[id]` |
| 보고서 (인쇄·PDF, Word 다운로드, 경영책임자 확인 → 회차 잠금) | `/app/periods/[id]/report` |
| 관련 법령 변경 목록과 "확인함" 기록 | `/app/laws` |
| 보관함 (5년 보관, 지난 반기 늦은 기록) | `/app/archive` |
| 회사 정보 · 구성원 초대(관리자/점검 담당/보기 전용) | `/app/settings` |
| 마감 알림 (30일·7일·1일 전, 지남) — 매일 09:00 KST | `/api/cron/reminders` |

점검 항목의 원천은 `src/lib/checklist/templates.ts` 하나다 (시행령 제4조·제5조, 2025-10-01 시행 기준).
회차가 열릴 때 제목·근거·안내문이 DB에 복사되므로, 이 파일을 고쳐도 지난 기록은 바뀌지 않는다.

## LawChange 와 공유하는 것

| 재사용 | 방법 |
|---|---|
| Supabase 프로젝트 (서울 리전 DB) | 같은 DB 에 **별도 스키마 `safety`** 를 만든다. public(LawChange)은 건드리지 않는다 |
| 법령 변경 데이터 | `public.legal_document`, `public.legal_change_event` 를 **읽기 전용 SQL** 로 조회 (`src/lib/laws/changes.ts`) |
| Supabase Auth | 같은 사용자 계정·매직 링크. LawChange 계정으로 그대로 로그인 가능 |
| Supabase Storage | 같은 프로젝트에 새 private 버킷 `safety-evidence` |
| 메일 발송 | LawChange 의 `email-transport.ts` 그대로 (SMTP 또는 Resend, 미설정 시 보류) |
| 법령 상세 화면 | 법령 변경을 누르면 LawChange 의 조문 신·구 비교 화면으로 이동 (`LAWCHANGE_URL`) |
| Vercel 계정 · 도메인 | 새 Vercel 프로젝트로 배포, 도메인은 서브도메인 추천 (예: `check.<LawChange 도메인>`) |

LawChange 와 다른 점: ORM 은 Prisma 대신 **Drizzle** 을 쓴다.
엔진 바이너리가 없어 서버리스 콜드 스타트가 빠르고 번들이 작으며, 마이그레이션이 SQL 파일로 남아 `safety` 스키마만 다루는지 눈으로 확인할 수 있다.

## 환경변수를 넣는 두 가지 방법

1. **Supabase ↔ Vercel 연동 (권장)** — Supabase 대시보드 → Integrations → Vercel 에서 이 Vercel 프로젝트를 연결하면
   `POSTGRES_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(또는 `SUPABASE_SECRET_KEY`) 가 자동으로 들어간다.
   코드는 이 이름들을 그대로 읽는다 (`src/lib/env.ts`). 키를 바꿔도 자동 반영된다.
2. **직접 입력** — `.env.example` 의 이름(`DATABASE_URL` 등)으로 넣으면 그 값이 우선한다.

## 처음 배포하기 (약 30분)

1. **환경변수** — `.env.example` 을 `.env.local` 로 복사하고 채운다. DB·Supabase 값은 LawChange `.env.local` 과 같다.
2. **DB 테이블 만들기** — `npm install` 후 `npm run db:migrate`.
   `drizzle/` 의 SQL 두 개가 실행되어 `safety` 스키마와 테이블 10개가 생긴다 (public 은 그대로).
3. **Supabase 대시보드**
   - Storage → New bucket → 이름 `safety-evidence`, **Private**
   - Authentication → URL Configuration → Redirect URLs 에 `https://<점검노트 도메인>/auth/callback` 추가
     (같은 Auth 를 쓰므로 LawChange 의 주소는 그대로 두고 **추가**만 한다)
   - API 설정의 Exposed schemas 에 `safety` 를 **넣지 않는다**
4. **Vercel** — 새 프로젝트로 이 폴더를 연결하고 환경변수를 넣는다. `CRON_SECRET` 을 넣으면 `vercel.json` 의 크론이 매일 알림을 돌린다.
5. **메일** — `RESEND_API_KEY`(또는 SMTP)와 `EMAIL_FROM` 을 넣기 전까지 알림은 보류(HELD)로 남고, 설정하면 다음 실행 때 나간다.

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # 로컬 Postgres 를 쓰려면 DATABASE_URL 만 바꾸고 DEV_LOGIN_ENABLED=1
npm run db:migrate
npm run dev                   # http://localhost:3100
```

`DEV_LOGIN_ENABLED=1` 이면 Supabase 없이 `/login` 에서 이메일만으로 들어갈 수 있다 (운영 빌드에서는 무시).
Supabase Storage 설정이 없으면 증빙 파일은 `.local-uploads/` 에 저장된다 (개발에서만).

검사: `npm run typecheck`, `npm test`, `npm run build`.

## 설계 메모

- **회사 단위 격리**: 모든 조회·수정은 로그인한 사용자의 회사 id 로 조건을 건다. 다른 회사의 id 를 넣어도 찾을 수 없음 처리.
- **기록은 사실만**: 확인 후 회차는 잠기고, 활동 기록(`activity`)은 수정하지 않는다. 증빙을 지워도 저장소의 파일은 남긴다(보관 의무).
- **"해당 없음"은 이유 필수**: 보고서에 그대로 남기 때문.
- **법령 데이터가 없어도 동작**: LawChange 테이블이 없는 DB 에 붙으면 법령 변경 칸만 "연결 안 됨"으로 나온다.
- **한글 파일명**: Next.js 14 서버 액션이 파일명을 latin1 로 읽는 문제를 `repairFileName` 으로 바로잡고, 저장소 키는 영문(uuid)만 쓴다.

## 더 해 보고 싶은 것

- 법정의무교육, 개인정보 내부관리계획 점검 메뉴 추가 (`templates.ts` 에 항목 세트만 추가하면 된다)
