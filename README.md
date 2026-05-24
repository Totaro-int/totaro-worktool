# Totaro 업무관리 툴

토타로 3인 팀의 모든 업무(개발 · 네이버 스토어 · 마케팅 · 문서)를 한 곳에 모아
**"누가 무슨 일을 했는지"** 통합 피드로 보여주는 사내 웹 대시보드.

## 기능 (1단계)

- **활동 피드** — 모든 업무가 시간순으로 모이는 통합 피드. 멤버 · 사업영역 · 출처별 필터.
- **할 일 보드** — 사업영역별 업무를 `할 일 / 진행 중 / 완료` 로 관리. 완료하면 피드에 자동 기록.
- **문서** — 서류 업로드 · 다운로드. 업로드하면 활동 피드에도 자동 기록.
- **구글 로그인** — 허가된 팀원만 접근.

사업영역: `AI 브랜딩` · `B2B 소싱 AI` · `AI 에이전트 판매`

> 👉 **팀원 설치(작업 자동 기록):** [`docs/설치.md`](docs/설치.md) 참고 — 본인 맥에서 1회 설치.

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Supabase — Postgres · 인증 · 파일 스토리지
- Tailwind CSS
- 배포: Vercel

---

## 처음 설정하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. 좌측 **SQL Editor → New query** 에 `supabase/schema.sql` 의 내용을 전부
   붙여넣고 **Run** 합니다. (테이블 · 권한 · 스토리지 버킷이 한 번에 만들어집니다)
3. 좌측 **Project Settings → API** 에서 아래 값을 확인합니다.
   - `Project URL`
   - `anon` `public` API key

### 3. 구글 로그인 설정

**Google Cloud Console** — https://console.cloud.google.com

1. 프로젝트 선택(또는 생성) → **API 및 서비스 → 사용자 인증 정보**
2. **사용자 인증 정보 만들기 → OAuth 클라이언트 ID → 웹 애플리케이션**
3. **승인된 리디렉션 URI** 에 다음을 추가합니다.
   ```
   https://<프로젝트-ref>.supabase.co/auth/v1/callback
   ```
   `<프로젝트-ref>` 는 Supabase `Project URL` 의 서브도메인입니다.
4. 생성된 **클라이언트 ID** 와 **클라이언트 보안 비밀** 을 복사합니다.

**Supabase 대시보드**

5. **Authentication → Sign In / Providers → Google** 을 켜고 위 값을 붙여넣습니다.
6. **Authentication → URL Configuration**
   - `Site URL`: `http://localhost:3000` (배포 후 Vercel 주소로 변경)
   - `Redirect URLs` 에 추가: `http://localhost:3000/**`

### 4. 환경변수 작성

`.env.local.example` 을 복사해 `.env.local` 파일을 만들고 값을 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_SITE_URL=
```

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속 → 구글 계정으로 로그인.
처음 로그인한 사람은 자동으로 멤버로 등록됩니다.

---

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 푸시합니다.
2. https://vercel.com → **New Project** → 해당 GitHub 저장소 선택.
3. **Environment Variables** 에 `.env.local` 의 값들을 등록합니다.
   `NEXT_PUBLIC_SITE_URL` 은 배포될 주소(예: `https://totaro-worktool.vercel.app`)로 채웁니다.
4. **Deploy**.
5. 배포 후 Supabase **Authentication → URL Configuration** 의
   `Site URL` 과 `Redirect URLs` 에 Vercel 주소를 추가합니다.
   (Google Cloud Console 의 리디렉션 URI 는 Supabase 주소이므로 그대로 둡니다)

이후 GitHub 에 푸시할 때마다 Vercel 이 자동 배포합니다.

---

## 폴더 구조

```
app/
  (app)/            로그인 후 화면 (사이드바 레이아웃 + 인증 가드)
    dashboard/      활동 피드
    tasks/          할 일 보드
    documents/      문서
  auth/             구글 OAuth 콜백 · 로그인/로그아웃 액션
  login/            로그인 페이지
components/          공용 UI 컴포넌트
lib/
  supabase/         Supabase 클라이언트 (서버 · proxy)
  types.ts          데이터 타입
supabase/
  schema.sql        데이터베이스 스키마 (Supabase SQL Editor 에서 실행)
```

---

## 다음 단계 (예정)

- **2단계 — GitHub 연동**: 커밋 · PR 이 활동 피드에 자동 표시
- **3단계 — 네이버 커머스 API 연동**: 스마트스토어 주문 · 상품 변경 자동 수집
- **4단계 — 확장**: 네이버 광고 연동, 알림, 주간 업무 요약
