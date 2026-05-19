# 프로젝트 아키텍처

> **작성일:** 2026-05-18
> **버전:** 1.0.0

## 개요

totaro-worktool은 토타로 팀의 내부 업무 관리 및 협업을 위한 풀스택 웹 애플리케이션입니다.

## 기술 스택

### 프론트엔드

- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **상태 관리:** React Context + Server State

### 백엔드

- **BaaS:** Supabase (PostgreSQL + Auth + Storage)
- **API:** Next.js API Routes + Server Actions
- **인증:** Supabase Auth (이메일/비밀번호)

### 개발 도구

- **린팅:** ESLint 9 + TypeScript ESLint
- **포맷팅:** Prettier
- **Git Hooks:** Husky + lint-staged
- **커밋 규칙:** Commitlint

## 디렉토리 구조

```
totaro-worktool/
├── app/                      # Next.js App Router
│   ├── (app)/                # 인증 필요 페이지 그룹
│   │   ├── dashboard/        # 대시보드
│   │   ├── tasks/            # 작업 관리
│   │   ├── documents/        # 문서 관리
│   │   └── layout.tsx        # 공통 레이아웃
│   ├── auth/                 # 인증 라우트
│   │   ├── callback/         # OAuth 콜백
│   │   └── actions.ts        # 인증 서버 액션
│   ├── login/                # 로그인 페이지
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 홈페이지
│
├── components/               # React 컴포넌트
│   ├── ui/                   # 기본 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── features/             # 기능별 컴포넌트
│   │   ├── TaskList.tsx
│   │   ├── DocumentEditor.tsx
│   │   └── ...
│   └── layout/               # 레이아웃 컴포넌트
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── ...
│
├── lib/                      # 유틸리티 및 헬퍼
│   ├── supabase/             # Supabase 클라이언트
│   │   ├── server.ts         # 서버 컴포넌트용
│   │   └── middleware.ts     # 미들웨어
│   ├── hooks/                # 커스텀 React Hooks
│   ├── utils/                # 유틸리티 함수
│   ├── types.ts              # 공통 타입 정의
│   └── constants.ts          # 상수
│
├── public/                   # 정적 파일
├── docs/                     # 프로젝트 문서
├── scripts/                  # 빌드/배포 스크립트
└── supabase/                 # Supabase 설정
```

## 데이터 흐름

### 1. 서버 컴포넌트 (기본)

```
클라이언트 요청
  → Next.js 서버
  → Supabase 쿼리
  → 서버 렌더링
  → HTML 응답
```

### 2. 클라이언트 컴포넌트 (인터랙션)

```
사용자 액션
  → 이벤트 핸들러
  → Server Action 호출
  → Supabase 쿼리
  → revalidatePath
  → 자동 리렌더링
```

### 3. 인증 흐름

```
로그인 시도
  → Supabase Auth
  → 쿠키 저장
  → 미들웨어 검증
  → 보호된 페이지 접근
```

## 주요 패턴

### Server Actions

데이터 변경 작업은 Server Actions로 처리:

```typescript
// app/(app)/tasks/actions.ts
'use server'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert(...)

  if (error) throw error
  revalidatePath('/tasks')
}
```

### 타입 안정성

Supabase에서 자동 생성된 타입 사용:

```typescript
// lib/types.ts
import type { Database } from './database.types'

export type Task = Database['public']['Tables']['tasks']['Row']
```

### 에러 경계

```typescript
// app/(app)/error.tsx
'use client'

export default function Error({ error, reset }) {
  return <ErrorDisplay error={error} onRetry={reset} />
}
```

## 성능 최적화

### 1. 서버 컴포넌트 우선

- 기본적으로 모든 컴포넌트는 서버 컴포넌트
- 클라이언트 상태가 필요한 경우만 `'use client'`

### 2. Dynamic Import

- 무거운 컴포넌트는 `next/dynamic`으로 지연 로딩
- 에디터, 차트 등

### 3. 이미지 최적화

- `next/image` 사용
- WebP 자동 변환
- Lazy loading

### 4. 캐싱 전략

- Server Components: 자동 캐싱
- API Routes: `revalidate` 옵션
- Static Generation: `generateStaticParams`

## 보안

### 1. 환경 변수

- `.env.local`에 비밀 키 저장
- 절대 `.env` 커밋 금지
- 클라이언트: `NEXT_PUBLIC_*` 접두어

### 2. Row Level Security (RLS)

- Supabase에서 RLS 정책 설정
- 사용자는 자신의 데이터만 접근

### 3. 서버 액션 검증

- Zod 스키마로 입력 검증
- 권한 확인

## 배포

### Vercel (권장)

1. GitHub 연결
2. 환경 변수 설정
3. 자동 배포

### 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 모니터링

- **에러 추적:** Sentry (예정)
- **분석:** Vercel Analytics
- **로그:** Supabase Logs

## 참고 자료

- [Next.js 16 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [API 명세서](./api-reference.md)
- [배포 가이드](./deployment.md)
