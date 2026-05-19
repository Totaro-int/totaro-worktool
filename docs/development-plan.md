# totaro-worktool 개발 계획

> **목표:** Phase 1~3 전체 완성 (오늘 안에)
> **작성일:** 2026-05-18

---

## 🎯 전체 개발 범위

### Phase 1: 핵심 대시보드

- 구글 로그인 (이메일 화이트리스트)
- 활동 피드 (직접 기록, 필터, 날짜 그룹핑)
- 할 일 보드 (칸반, CRUD, 완료 시 자동 피드 기록)
- 문서 관리 (업로드, 다운로드, 자동 피드 기록)

### Phase 2: GitHub 연동

- GitHub App 설정 + Webhook
- 커밋/PR 자동 수집 → activities
- Claude Code 작업 감지 배지
- 저장소 ↔ 사업영역 매핑

### Phase 3: 네이버 커머스 연동

- 네이버 커머스 API 연동
- 주문/상품 변경 자동 수집
- GitHub Actions Cron 스케줄러
- 더미 데이터로 먼저 개발 (API 승인 대기 중)

---

## 📋 필요한 API 키

### 필수 (즉시)

- [x] Supabase URL + Anon Key ✅
- [ ] Google OAuth Client ID + Secret
- [ ] GitHub App ID + Private Key + Webhook Secret

### 필수 (승인 대기 가능)

- [ ] 네이버 커머스 Client ID + Secret

### 선택

- [ ] SendGrid API Key
- [ ] Sentry DSN
- [ ] Google Analytics Measurement ID

---

## 🗂️ 데이터베이스 스키마

### 테이블 구조

```sql
members         -- 팀원 (auth.users와 1:1)
work_areas      -- 사업영역 (AI 브랜딩, B2B 소싱, AI 에이전트)
tasks           -- 할 일
activities      -- 통합 활동 피드
documents       -- 문서
github_repos    -- GitHub 저장소 (Phase 2)
integration_state -- 네이버 폴링 커서 (Phase 3)
```

---

## 🏗️ 개발 순서

### 1. 인프라 세팅 (30분)

- [x] Supabase 프로젝트 생성 ✅
- [ ] DB 스키마 실행
- [ ] Google OAuth 설정
- [ ] Storage 버킷 확인

### 2. Phase 1 개발 (3시간)

#### 2.1 인증 (30분)

```typescript
// app/auth/actions.ts
- signInWithGoogle()
- signOut()
- 이메일 화이트리스트 체크
```

#### 2.2 활동 피드 (1시간)

```typescript
// app/(app)/dashboard/page.tsx
- 직접 기록 폼
- 필터 (멤버, 영역, 출처)
- 날짜 그룹핑 (오늘/어제/이번 주)
- 더 보기 (100건 초과 시)
```

#### 2.3 할 일 보드 (1시간)

```typescript
// app/(app)/tasks/page.tsx
- 3컬럼 칸반 (할 일/진행 중/완료)
- CRUD (생성, 상태 변경, 삭제)
- 완료 시 activities 자동 삽입
- 마감 임박 표시
```

#### 2.4 문서 관리 (30분)

```typescript
// app/(app)/documents/page.tsx
- 파일 업로드 (Supabase Storage)
- 다운로드 (서명 URL)
- 업로드 시 activities 자동 삽입
```

### 3. Phase 2 개발 (2시간)

#### 3.1 GitHub App 설정 (30분)

- GitHub App 생성
- Webhook 엔드포인트 구현
- 서명 검증

#### 3.2 Webhook 핸들러 (1시간)

```typescript
// app/api/webhooks/github/route.ts
- push 이벤트 → 커밋 정보 파싱
- pull_request 이벤트 → PR 정보 파싱
- Claude Code 감지 (Co-Authored-By)
- activities 삽입
```

#### 3.3 저장소 매핑 (30분)

```typescript
// github_repos 테이블
- repo_full_name ↔ work_area_id 매핑
- 설정 UI (간단한 폼)
```

### 4. Phase 3 개발 (2시간)

#### 4.1 네이버 API 연동 (1시간)

```typescript
// lib/naver/commerce.ts
- fetchNewOrders(lastSyncTime)
- fetchProductChanges(lastSyncTime)
- activities 변환
```

#### 4.2 Cron 엔드포인트 (30분)

```typescript
// app/api/cron/naver/route.ts
- 주기적 폴링
- integration_state 커서 갱신
- 에러 핸들링
```

#### 4.3 GitHub Actions Cron (30분)

```yaml
# .github/workflows/naver-sync.yml
- 5분마다 실행
- /api/cron/naver 호출
```

### 5. 테스트 & 버그 수정 (1시간)

- 로그인 플로우 테스트
- 모든 CRUD 동작 확인
- Webhook 테스트 (실제 커밋)
- 네이버 더미 데이터 확인

### 6. 배포 (30분)

- GitHub 저장소 푸시
- Vercel 프로젝트 생성
- 환경변수 설정
- 프로덕션 배포

---

## 🛠️ 기술 스택

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Google OAuth)
- **Storage:** Supabase Storage
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel
- **Cron:** GitHub Actions

---

## 📊 예상 소요 시간

| 단계               | 예상 시간 | 실제 시간 |
| ------------------ | --------- | --------- |
| 인프라 세팅        | 30분      |           |
| Phase 1 개발       | 3시간     |           |
| Phase 2 개발       | 2시간     |           |
| Phase 3 개발       | 2시간     |           |
| 테스트 & 버그 수정 | 1시간     |           |
| 배포               | 30분      |           |
| **총합**           | **9시간** |           |

---

## ⚠️ 리스크 및 대응

### 1. 네이버 커머스 API 승인 지연

- **리스크:** 승인이 내일 이후로 밀릴 수 있음
- **대응:** 더미 데이터로 먼저 개발, 승인 후 실제 API 연결

### 2. GitHub Webhook 테스트

- **리스크:** 로컬에서 Webhook 수신 어려움
- **대응:** ngrok 사용 또는 Vercel 배포 후 테스트

### 3. Supabase Storage 권한

- **리스크:** RLS 정책 설정 오류
- **대응:** schema.sql에 정책 포함, 테스트 필수

### 4. 시간 부족

- **리스크:** 9시간 > 실제 작업 가능 시간
- **대응:** Phase 3는 최소 기능만 구현, 세부 기능은 내일

---

## 🎯 최소 완성 기준 (MVP)

### Phase 1

- ✅ 로그인/로그아웃 동작
- ✅ 활동 피드 표시
- ✅ 할 일 생성/완료
- ✅ 문서 업로드/다운로드

### Phase 2

- ✅ GitHub 커밋 → 피드 표시
- ✅ GitHub PR → 피드 표시

### Phase 3

- ✅ 네이버 더미 데이터 → 피드 표시
- ✅ Cron 엔드포인트 동작 (실제 API는 승인 후)

---

## 📝 개발 중 참고 문서

- `docs/architecture.md` - 전체 아키텍처
- `docs/database-schema.md` - DB 스키마
- `docs/api-reference.md` - API 명세
- `AGENTS.md` - AI 작업 규칙
- `README.md` - 프로젝트 개요

---

## ✅ 체크리스트

### API 키 발급

- [ ] Google OAuth
- [ ] GitHub App
- [ ] 네이버 커머스 (신청)

### 개발

- [ ] Phase 1 완성
- [ ] Phase 2 완성
- [ ] Phase 3 완성 (더미)

### 배포

- [ ] Vercel 배포
- [ ] 환경변수 설정
- [ ] 도메인 연결 (선택)

---

**시작 시각:**
**완료 목표:** 오늘 자정 전

**화이팅! 🔥**
