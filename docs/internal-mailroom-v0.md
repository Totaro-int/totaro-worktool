# 내부 AI 우편실 v0 — Internal AI Mailroom

> 카카오톡으로 흩어지던 모든 팀 내부 서류를 Google Drive로 옮기고, AI가 자동 분류·알림하는 시스템. 워크허브 안에서 한 번 드롭하면 끝.

**상태:** Draft → Building
**담당:** 윤태준
**영역:** 마케팅 에이전트 (내부 AI 비서 시스템)
**산정:** 1~1.5주 풀타임 1명
**관련 task:** `tasks` 테이블의 "내부 AI 우편실 v0 — Drive 자동 분류·알림·카톡 마이그"

---

## 1. 배경 — 왜 만드는가

### 1.1 데이터 분산 페인

토타로 팀은 데이터를 10개 채널에 분산 저장 중. 통합 inventory 결과:

| 채널                   | 페인                         | 가치                  | 통합 우선순위          |
| ---------------------- | ---------------------------- | --------------------- | ---------------------- |
| 카카오톡               | 🔴 모든 서류 거기 + API 없음 | 🔴 매우 높음          | **v0 우회**            |
| Google Drive           | 🟡 구조 없어 안 씀           | 🔴 매우 높음 (저장소) | **v0 핵심**            |
| 로컬 폴더              | 🟢 백업 약함                 | 🟡 중간               | v1 (watch)             |
| Gmail                  | 🔴 묻힘·놓침                 | 🔴 높음               | v1                     |
| 네이버 메일            | 🟡 묻힘 (지원사업)           | 🟡 중간               | v1 (IMAP)              |
| Figma                  | 🟢 사일로                    | 🟡 중간               | v1 (export)            |
| Apple/Samsung Calendar | 🟢 안 씀                     | 🟢 낮음 (행동 문제)   | v2 또는 보류           |
| GitHub                 | 🟢 README                    | 🔴 높음               | v1 (README 보강)       |
| Claude                 | 🔴 메모리·분산               | 🔴 매우 높음          | v1 (검색·메모리 layer) |

### 1.2 v0 wedge

**v0 = 카톡을 채팅 only로 다이어트 + Drive를 진짜 사용 가능한 중앙 저장소로.** 이게 풀리면 v1 채널 통합 다 깔리는 토대.

핵심 통찰: Drive를 안 쓰는 진짜 이유는 **(1) 폴더 구조가 없어서 어디 둘지 모름 + (2) 권한 관리 귀찮음**. AI가 자동 분류·폴더 생성하면 두 페인 동시 해결.

---

## 2. 사용자 흐름 (User Flow)

```
[사용자] 워크허브 /inbox 페이지에서 파일 드래그 드롭
       ↓
   업로드 폼:
    · 한 줄 설명 ("모네 하우스 계약 초안")
    · 알림 받을 사람 (드롭다운, 멀티 선택)
       ↓
[AI 에이전트 = Claude Opus] 분석
   입력: 파일명 + 설명 + 현재 폴더 트리 + 가능 멤버 목록
   출력: { target_folder, notify_users, summary, confidence }
       ↓
[확인 화면] "추천: /02 AI 시스템/마케팅 에이전트/ 에 저장,
            준빈 알림 예정. 진행?" [확인] [수정] [취소]
       ↓
[실행] Drive 업로드 + Supabase 메타 저장 + in-app 알림 발송
```

### 2.1 카톡 일괄 마이그레이션 (batch 모드)

태준이 카톡 톡클라우드에서 일괄 다운받아 한 번에 업로드.

- 10~100 파일 한 번에 드래그
- batch-level 한 줄 설명 + 개별 override 가능
- 백그라운드 분류 (진행률 표시)
- 결과 미리보기 → 일괄 confirm 또는 개별 수정

---

## 3. Drive 폴더 구조 (v0 기준)

플랫폼 비즈니스 axis 기준 (고객사별 X). 번호 prefix로 정렬 보장.

```
/01 제품 (Product)/
   /워크허브 (internal)/
   /totaro_web (공급사 측)/
   /totaro_cos (바이어 측)/
   /랜딩페이지·웹 자산/
   /기획·spec·디자인/
   /버그·이슈 트래킹 자료/

/02 AI 시스템/
   /마케팅 에이전트/
   /AI 상담 (sj-company)/
   /추천·매칭 엔진/
   /견적 자동화/
   /시스템 프롬프트 archive/
   /평가·테스트 결과/

/03 공급사 운영 (sourcing 측)/
   /PoC 인포 시트/
   /모집 채널·게이트키퍼/
   /개별 공급사 기록/
   /식품 수출 도메인 자료 (KOTRA·aT 등)/

/04 바이어 운영 (buyer 측)/
   (v1 단계 — 바이어 모집 시 활용)

/05 마케팅·콘텐츠/
   /AEO·GEO 측정 데이터/
   /콘텐츠 draft/
   /인플루언서 협업/
   /언론·PR/

/06 회사 운영/
   /인사·계약·근로/
   /회의록·전략 문서/
   /정부 지원사업/
   /재무·세무·인보이스/
   /브랜드·로고·CI/

/07 외부 프로젝트 (곁가지·외주)/
   /모네 하우스 BI/
   /(다른 외주 발생 시)/

/99 휴지통/  (soft delete, 30일 보존)
```

### 3.1 새 폴더 자동 생성

에이전트가 들어오는 문서가 기존 폴더에 안 맞으면 **새 폴더 자동 생성**.
예: 새 공급사 `대성식품` 인포 시트 → `/03 공급사 운영/개별 공급사 기록/대성식품/` 자동 생성.
사용자에게 사후 알림: "새 폴더 `대성식품` 만들었음".

---

## 4. AI 분류 — input·output·prompt

### 4.1 Input 신호 (우선순위)

1. 파일명 (primary)
2. 사용자 한 줄 설명 (가장 강한 신호 — 이게 있으면 confidence ↑)
3. 텍스트 추출 결과 (PDF·docx·xlsx 본문 — 첫 1000자 sample)
4. 이미지 분석 (Vision API — 첫 페이지 시각 정보)
5. 현재 폴더 트리 (선택지)
6. 최근 작업 컨텍스트 (진행 중인 task 목록 — Supabase `tasks` 테이블에서)

### 4.2 Output (JSON)

```json
{
  "target_folder_path": "/03 공급사 운영/개별 공급사 기록/대성식품/",
  "create_folder_if_missing": true,
  "notify_users": ["윤태준", "최준빈"],
  "summary": "대성식품 PoC 인터뷰 결과 — 라면 OEM, 일본 수출 의지 있음",
  "doc_type": "PoC 인포 시트",
  "confidence": 0.87,
  "alternatives": [{ "folder": "/03 공급사 운영/PoC 인포 시트/", "confidence": 0.72 }]
}
```

### 4.3 분류 프롬프트 (Claude Opus)

```
토타로 팀의 문서 자동 분류 에이전트입니다. 한국 식품 제조사를 해외 바이어와 매칭하는 AI 플랫폼 사업입니다.

[회사 정보]
- 본업: 공급사·바이어 매칭 + AI 자동 견적·추천 플랫폼 (totaro_web/cos)
- 팀: 윤태준(공동창업/제품), 최준빈(리서치·BI), 송승주/업플로우(개발)
- 진행 중 task 목록: {tasks 목록 동적 주입}

[가능한 폴더 트리]
{Drive 현재 폴더 구조 JSON으로 주입}

[입력 문서]
- 파일명: {filename}
- 사용자 설명: {user_description}
- 텍스트 추출 (1000자): {extracted_text or '없음'}
- 이미지 분석: {vision_summary or '없음'}

[작업]
1. 가장 적합한 폴더 경로 결정. 없으면 새 폴더 제안.
2. 알림 받아야 할 멤버 추론 (관련 task 담당자 우선).
3. 문서 요약 한 줄 (40자 내외).
4. 문서 종류 라벨 (계약서/견적서/회의록/리서치/디자인/...).
5. confidence 점수 (0~1).
6. confidence < 0.7 면 alternatives 2개 제안.

[출력 JSON 스키마]
{ "target_folder_path": "...", "create_folder_if_missing": bool,
  "notify_users": ["이름", ...], "summary": "...", "doc_type": "...",
  "confidence": 0~1, "alternatives": [{...}, {...}] (선택) }

규칙:
- 폴더 경로는 반드시 "/" 시작, 마지막 "/"로 끝
- 새 폴더는 7-axis 구조 유지 (01~07 + 99)
- 추측 약하면 confidence 낮추기. 거짓 자신감 X.
- 마크다운·설명문 없이 JSON만 출력
```

---

## 5. 자율성 원칙 (에이전트 capabilities)

**한 줄 원칙:** _되돌릴 수 있는 건 자유, 못 되돌리는 건 사용자만._

| 행동                        | 자율 수준                              | 비고                             |
| --------------------------- | -------------------------------------- | -------------------------------- |
| 폴더 생성                   | 🟢 자유 (자동)                         | 사후 알림만                      |
| 파일 분류·업로드            | 🟢 자유 (단 v0는 사용자 confirm 1단계) | v1+에서 신뢰 쌓이면 자동         |
| 요약·메타 생성              | 🟢 자유                                |                                  |
| 알림 발송                   | 🟢 자유                                | 사용자 지정 + 에이전트 추가 가능 |
| 폴더·파일 이름 변경         | 🟡 감사 로그 + undo (1시간)            | `document_moves` 테이블          |
| 파일 이동                   | 🟡 감사 로그 + undo (1시간)            |                                  |
| 외부 공유 (Drive 권한 추가) | 🟠 사용자 명시 확인                    | 정보 유출 가능                   |
| 휴지통 이동 (soft delete)   | 🟠 사용자 액션, 30일 보존              | `/99 휴지통/`                    |
| 영구 삭제                   | 🔴 사용자 단독 + 명시 확인             | 휴지통 비우기                    |

---

## 6. 기술 아키텍처

### 6.1 컴포넌트

| 컴포넌트    | 무엇으로                                                      |
| ----------- | ------------------------------------------------------------- |
| 드롭존 UI   | Next.js page `/inbox` (Server Component + Client 드래그 드롭) |
| 파일 업로드 | Supabase Storage (임시 버퍼) → Drive로 옮김                   |
| Drive 통합  | Google Drive API v3 (service account)                         |
| 메타·인덱스 | Supabase `documents` 테이블                                   |
| AI 분류     | Claude Opus (Anthropic API or Claude CLI)                     |
| 알림        | Supabase `notifications` 테이블 + 워크허브 헤더 빨간 점       |
| 권한        | RLS — authenticated 멤버 전원 read/write (v0는 단순)          |

### 6.2 파일 종류 처리 tier

| Tier | 종류                           | v0 처리                                         |
| ---- | ------------------------------ | ----------------------------------------------- |
| 1    | PDF(텍스트)·docx·xlsx·txt·md   | 즉시 텍스트 추출 → Claude 분류                  |
| 2    | 이미지 (jpg/png/heic)·스캔 PDF | Claude Vision 직접                              |
| 3    | hwp (한글)                     | 파일명 + 사용자 설명만 → 분류, 텍스트 추출은 v1 |
| 4    | 음성·영상 (mp3/mp4)            | 파일명만 → 분류, Whisper는 v1                   |
| 5    | zip·코드                       | 파일명만, zip 내부 미분석                       |

→ **v0 정책: 모든 종류 저장 가능, 분류는 tier별로 best-effort. confidence < 0.7 이면 사용자에게 폴더 선택 다이얼로그.**

### 6.3 Drive 통합 — service account 방식

- Google Cloud Console에서 service account 생성
- Drive API enable
- service account에 팀 공유 Drive 권한 부여 (또는 토타로 폴더만)
- service account 키 JSON → `.env.local`의 `GOOGLE_SERVICE_ACCOUNT_JSON`
- 모든 업로드·읽기는 server-side에서 service account로

장점: 개별 사용자 OAuth 불필요. 단순.
단점: 모든 파일이 service account 소유 — 사용자별 권한 X (v0는 단일 권한 풀이라 OK).

### 6.4 Claude 분류 호출

v0: server action에서 `claude` CLI 호출 (`SUMMARY_MODEL = 'opus'`).

- 이미 logger 패턴에서 검증됨
- 단점: PATH 의존, 디스크 의존
- v1에서 Anthropic SDK 직접 호출로 전환 고려 (subscription 대신 API)

---

## 7. DB 스키마

### 7.1 `documents` 테이블

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  description text,
  drive_file_id text unique,
  drive_folder_id text,
  folder_path text,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references public.members(id),
  classified_by_ai boolean default false,
  classification_confidence numeric,
  ai_reasoning text,
  doc_type text,
  notify_users uuid[] default '{}',
  status text default 'pending'
    check (status in ('pending','classified','confirmed','rejected','failed','trashed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.documents (status, created_at desc);
create index on public.documents (uploaded_by, created_at desc);
create index on public.documents (folder_path);
```

### 7.2 `document_moves` — 감사 로그

```sql
create table public.document_moves (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  from_folder_path text,
  to_folder_path text,
  moved_by uuid references public.members(id),
  reason text,
  reversible_until timestamptz,
  reverted boolean default false,
  created_at timestamptz default now()
);

create index on public.document_moves (document_id, created_at desc);
```

### 7.3 `notifications` — in-app 알림

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.members(id) not null,
  type text not null,
  related_table text,
  related_id uuid,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index on public.notifications (recipient_id, read_at, created_at desc);
```

### 7.4 RLS 정책

```sql
alter table public.documents enable row level security;
alter table public.document_moves enable row level security;
alter table public.notifications enable row level security;

-- documents: 인증 멤버 모두 read/write
create policy "auth read documents" on public.documents
  for select using (auth.role() = 'authenticated');
create policy "auth write documents" on public.documents
  for insert with check (auth.role() = 'authenticated');
create policy "auth update documents" on public.documents
  for update using (auth.role() = 'authenticated');

-- moves: 인증 멤버 read/write
create policy "auth read moves" on public.document_moves
  for select using (auth.role() = 'authenticated');
create policy "auth write moves" on public.document_moves
  for insert with check (auth.role() = 'authenticated');

-- notifications: 본인 것만
create policy "own read notifications" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "service write notifications" on public.notifications
  for insert with check (true);
create policy "own update notifications" on public.notifications
  for update using (recipient_id = auth.uid());
```

---

## 8. v0 구현 단계 (체크리스트)

- [ ] **Setup (Day 1)**
  - [ ] Supabase 스키마 적용 (`supabase/documents.sql`)
  - [ ] Google Cloud project + service account + Drive API enable
  - [ ] service account key → `.env.local` (`GOOGLE_SERVICE_ACCOUNT_JSON`)
  - [ ] Drive에 토타로 폴더 + 7-axis 구조 초기 생성 (수동 또는 스크립트)
- [ ] **Backend (Day 2~3)**
  - [ ] `lib/drive/client.ts` — Drive API client (upload, listFolders, createFolder, move, trash)
  - [ ] `lib/mailroom/extract.ts` — 파일 텍스트 추출 (pdf-parse, mammoth, exceljs)
  - [ ] `lib/mailroom/classify.ts` — Claude 호출, JSON 응답 파싱
  - [ ] `app/(app)/inbox/actions.ts` — server actions (uploadAndClassify, confirmClassification, rejectClassification, batchUpload)
- [ ] **Frontend (Day 4~5)**
  - [ ] `app/(app)/inbox/page.tsx` — 드래그 드롭, 단일/batch 모드
  - [ ] `app/(app)/inbox/components/UploadForm.tsx` — 한 줄 설명, 알림 수신자
  - [ ] `app/(app)/inbox/components/ClassificationPreview.tsx` — 추천 결과 확인
  - [ ] `app/(app)/inbox/components/BatchProgress.tsx` — batch 진행률
- [ ] **알림 (Day 5)**
  - [ ] 워크허브 헤더 알림 종 + 빨간 점
  - [ ] `/notifications` 페이지 (간단 리스트)
- [ ] **마이그레이션 (Day 6)**
  - [ ] 태준이 카톡 톡클라우드 다운로드 → /inbox batch 모드로 일괄 업로드
- [ ] **테스트·정리 (Day 7)**
  - [ ] E2E 흐름 검증
  - [ ] 문서·README 업데이트
  - [ ] 팀 demo + 피드백

---

## 9. v1 로드맵 (참고)

v0 successful → v1에서 채널별 통합 wave:

- ✅ Claude MCP 서버 (`scripts/mailroom-mcp.ts`) — Claude Code/Desktop 에서 우편실 검색·읽기·업로드 4 도구
- 🟡 Gmail 자동 백업 (`lib/gmail/client.ts` + `scripts/gmail-sync.ts`) — OAuth 인증 골격 완성, 첫 sync 대기
- ⏳ 네이버 메일 (IMAP) → 통합 받은편지함
- ⏳ Figma → 자동 export to Drive
- ⏳ 로컬 폴더 watch (`~/totaro-inbox/`)
- ⏳ GitHub README 자동 보강
- ⏳ Claude conversation 검색 layer (메모리 layer 시작)

### Gmail v1 사용 순서

1. **Google Cloud Console 준비** (한 번만)
   - `totaro-mailroom` 프로젝트 > APIs & Services > Gmail API "Enable"
   - OAuth consent screen 만들기 (External, scopes: `gmail.readonly` + `gmail.modify`)
   - Credentials > Create OAuth client > **Desktop app** → Client ID / Secret 받기
2. **인증** (한 번만)
   - `.env.local` 에 `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` 임시 박기
   - `npx tsx scripts/gmail-auth.ts` → 브라우저 동의 → `GMAIL_REFRESH_TOKEN` 받아서 `.env.local` 에 박기
3. **스키마 마이그레이션** (한 번만)
   - Supabase SQL Editor 에 `supabase/inbox-mailroom-source-column.sql` 통째로 붙여넣기 + Run
4. **첫 sync 시운전**
   - `npx tsx scripts/gmail-sync.ts --days 1 --dry-run` — 분류만 보고 실제 저장 X
   - 분류 결과 괜찮으면 → `npx tsx scripts/gmail-sync.ts --days 1`
5. **자동화** (다음 세션)
   - launchd LaunchAgent 또는 Vercel Cron 으로 매 1 시간마다 sync

---

## 10. 성공 기준

- [ ] 팀원 모두 카톡 대신 `/inbox`로 문서 보내기 시작 (1주 안)
- [ ] AI 분류 정확도 ≥ 80% (사용자 confirm·수정 비율로 측정)
- [ ] 카톡 톡클라우드 → Drive 일괄 마이그 완료 (`/01~07` 폴더에 기존 자료 다 정리)
- [ ] "지난주에 그 PDF 어디 갔지?" 같은 페인 해소 — Drive 검색 한 번이면 찾음

---

## 변경 이력

| 일자       | 변경                                   | 작성                                   |
| ---------- | -------------------------------------- | -------------------------------------- |
| 2026-05-29 | 초안 — 10채널 inventory 결과 + v0 spec | 윤태준 / Totaro (with Claude Opus 4.7) |
