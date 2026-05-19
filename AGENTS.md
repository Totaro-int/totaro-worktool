# AI 에이전트 작업 지시서

> **이 파일을 읽는 Claude(또는 다른 AI)에게:** 이 문서는 totaro-worktool 프로젝트 작업 시 반드시 따라야 할 규칙, 아키텍처 제약, 그리고 프로젝트 특화 지침을 담고 있습니다. 추측하지 말고, 본 문서에 명시된 내용만 따르십시오.

---

## 📋 프로젝트 개요

**프로젝트명:** totaro-worktool
**스택:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase
**목적:** 토타로 팀 내부 업무 관리 및 협업 도구

---

## 🏗️ 아키텍처 원칙

### 1. 디렉토리 구조 규칙

```
app/
├── (app)/              # 인증 필요한 페이지 그룹
│   ├── dashboard/
│   ├── tasks/
│   ├── documents/
│   └── layout.tsx      # 공통 레이아웃 (네비게이션, 사이드바)
├── auth/               # 인증 관련 (콜백, 미들웨어)
├── login/              # 로그인 페이지
└── layout.tsx          # 루트 레이아웃

components/
├── ui/                 # 재사용 가능한 UI 컴포넌트 (버튼, 카드 등)
├── features/           # 기능별 컴포넌트 (TaskList, DocumentEditor 등)
└── layout/             # 레이아웃 컴포넌트 (Header, Sidebar 등)

lib/
├── supabase/           # Supabase 클라이언트 및 헬퍼
├── hooks/              # 커스텀 React Hooks
├── utils/              # 유틸리티 함수
├── types.ts            # 공통 타입 정의
└── constants.ts        # 상수 정의

docs/                   # 프로젝트 문서화 (아키텍처, API, 가이드)
```

### 2. 파일 명명 규칙

| 파일 유형      | 규칙                        | 예시                                      |
| -------------- | --------------------------- | ----------------------------------------- |
| React 컴포넌트 | PascalCase                  | `TaskList.tsx`, `UserProfile.tsx`         |
| 유틸리티/함수  | camelCase                   | `formatDate.ts`, `validateEmail.ts`       |
| 타입 정의      | PascalCase (Type/Interface) | `type User = {...}`                       |
| 상수           | UPPER_SNAKE_CASE            | `MAX_FILE_SIZE`, `API_ENDPOINTS`          |
| 라우트 파일    | kebab-case                  | `page.tsx`, `layout.tsx`, `not-found.tsx` |

### 3. 임포트 순서 (ESLint로 강제)

```typescript
// 1. 외부 라이브러리
import React from 'react'
import { useRouter } from 'next/navigation'

// 2. 내부 절대 경로 (@/)
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

// 3. 상대 경로
import { TaskCard } from './TaskCard'

// 4. 타입 임포트 (마지막)
import type { Task } from '@/lib/types'
```

---

## 🔒 코드 작성 제약

### 1. TypeScript Strict Mode

- **모든 함수에 타입 명시** 필수 (매개변수 + 반환값)
- `any` 사용 금지 (불가피한 경우 `unknown` + 타입 가드 사용)
- Optional chaining (`?.`) 및 Nullish coalescing (`??`) 적극 활용

```typescript
// ❌ 나쁜 예
function getUser(id) {
  return fetch(`/api/users/${id}`)
}

// ✅ 좋은 예
async function getUser(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) return null
  return response.json()
}
```

### 2. Next.js 16 App Router 규칙

- **Server Components 우선**: 클라이언트 상태가 필요한 경우만 `'use client'`
- **Server Actions 활용**: form 제출, 데이터 변경 시 Server Actions 사용 (`actions.ts`)
- **Dynamic Import**: 무거운 컴포넌트는 `next/dynamic`으로 지연 로딩

```typescript
// ❌ 모든 컴포넌트를 Client Component로
'use client'
export default function Page() { ... }

// ✅ Server Component 기본, 필요 시에만 분리
// page.tsx (Server Component)
import { TaskList } from './TaskList'

// TaskList.tsx (필요 시에만 'use client')
'use client'
export function TaskList() { ... }
```

### 3. Supabase 클라이언트 사용

- **Server에서**: `createClient()` from `@/lib/supabase/server` (쿠키 기반)
- **Client에서**: `createBrowserClient()` from `@supabase/ssr`
- **절대 API 키 노출 금지**: 환경 변수로 관리 (`.env.local`)

### 4. 에러 처리 패턴

```typescript
// ✅ 모든 비동기 작업에 에러 처리
try {
  const result = await fetchData()
  return { success: true, data: result }
} catch (error) {
  console.error('Error fetching data:', error)
  return { success: false, error: '데이터를 불러올 수 없습니다.' }
}
```

---

## 🎨 스타일링 규칙

### Tailwind CSS 사용 원칙

1. **유틸리티 클래스 우선**: 커스텀 CSS 최소화
2. **일관된 spacing**: `p-4`, `gap-2` 등 4의 배수 기준
3. **반응형 디자인**: 모바일 우선 (`sm:`, `md:`, `lg:`)
4. **다크모드 대응**: `dark:` 접두어 사용

```tsx
// ✅ 좋은 예
<div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-900">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Title</h2>
</div>
```

---

## 🧪 테스트 및 검증

### 작업 전 체크리스트

- [ ] TypeScript 컴파일 에러 없음 (`npm run build`)
- [ ] ESLint 경고 없음 (`npm run lint`)
- [ ] 라우팅 동작 확인 (페이지 이동, 뒤로가기)
- [ ] 인증 상태 확인 (로그인/로그아웃)
- [ ] 반응형 확인 (모바일/데스크톱)

### 금지 사항

- ❌ `console.log` 프로덕션 코드에 남기기
- ❌ 하드코딩된 URL/키/비밀번호
- ❌ 주석 처리된 코드 대량 커밋
- ❌ `node_modules` 또는 `.next` 수정
- ❌ 타입 단언(`as`) 남용

---

## 📚 자주 사용하는 패턴

### 1. Server Action 패턴

```typescript
// app/(app)/tasks/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string

  const { error } = await supabase.from('tasks').insert({ title })

  if (error) throw error

  revalidatePath('/tasks')
}
```

### 2. 커스텀 Hook 패턴

```typescript
// lib/hooks/useUser.ts
'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/lib/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 사용자 정보 fetch
  }, [])

  return { user, loading }
}
```

---

## 🚨 긴급 시 참조 문서

- **Next.js 16 최신 변경사항**: `node_modules/next/dist/docs/` (AI 학습 데이터와 다름 주의!)
- **프로젝트 아키텍처**: `docs/architecture.md`
- **API 명세**: `docs/api-reference.md`
- **배포 가이드**: `docs/deployment.md`

---

## 🔄 버전 관리

| 일자       | 변경 사항                                   |
| ---------- | ------------------------------------------- |
| 2026-05-18 | 초기 AGENTS.md 작성 (하네스 엔지니어링 3.1) |

---

> **마지막 메시지:** 이 문서는 프로젝트의 "헌법"입니다. 불확실할 때는 추측하지 말고, 이 문서를 다시 읽고, 필요하면 `docs/` 디렉토리의 관련 문서를 참조하십시오. 일관성 > 영리함.
