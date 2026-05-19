# 개발 가이드

> **작성일:** 2026-05-18
> **버전:** 1.0.0

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/totaro/worktool.git
cd worktool
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 편집:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 개발 워크플로우

### 1. 브랜치 전략

```
main (프로덕션)
  ├── develop (개발)
  │   ├── feature/task-list
  │   ├── feature/document-editor
  │   └── fix/auth-redirect
  └── hotfix/critical-bug
```

**브랜치 명명 규칙:**

- `feature/기능명`: 새 기능 개발
- `fix/버그명`: 버그 수정
- `refactor/항목명`: 리팩토링
- `docs/문서명`: 문서 수정

### 2. 작업 프로세스

```bash
# 1. 최신 코드 가져오기
git checkout develop
git pull origin develop

# 2. 새 브랜치 생성
git checkout -b feature/task-filter

# 3. 작업 진행
# ... 코드 작성 ...

# 4. 커밋 (Husky가 자동으로 검증)
git add .
git commit -m "feat: 작업 필터 기능 추가"

# 5. 푸시
git push origin feature/task-filter

# 6. Pull Request 생성
# GitHub에서 PR 생성 → develop으로 머지 요청
```

---

## 코드 작성 규칙

### 1. 파일 구조

```typescript
// ✅ 좋은 예
// components/features/TaskList.tsx
import type { Task } from '@/lib/types'

interface TaskListProps {
  tasks: Task[]
  onTaskClick: (taskId: string) => void
}

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  // 구현
}
```

### 2. 타입 정의

```typescript
// ❌ 나쁜 예
function updateTask(id, data) { ... }

// ✅ 좋은 예
async function updateTask(
  id: string,
  data: Partial<Task>
): Promise<Task | null> {
  // 구현
}
```

### 3. Server Actions

```typescript
// app/(app)/tasks/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

export async function createTask(formData: FormData): Promise<void> {
  const supabase = await createClient()

  // 1. 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. 데이터 추출
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  // 3. 검증
  if (!title || title.length < 3) {
    throw new Error('제목은 3자 이상이어야 합니다')
  }

  // 4. DB 작업
  const { error } = await supabase.from('tasks').insert({
    title,
    description,
    user_id: user.id,
  })

  if (error) throw error

  // 5. 캐시 무효화
  revalidatePath('/tasks')
}
```

### 4. 컴포넌트 분리

```typescript
// ❌ 나쁜 예: 하나의 큰 컴포넌트
export function TaskPage() {
  // 200줄의 코드...
}

// ✅ 좋은 예: 관심사 분리
// app/(app)/tasks/page.tsx (Server Component)
export default async function TasksPage() {
  const tasks = await fetchTasks()
  return <TaskList tasks={tasks} />
}

// components/features/TaskList.tsx (Client Component)
'use client'
export function TaskList({ tasks }) {
  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}

// components/features/TaskCard.tsx
export function TaskCard({ task }) {
  return <div>{task.title}</div>
}
```

---

## 디버깅

### 1. React Developer Tools

브라우저 확장 프로그램 설치:

- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### 2. Next.js 디버깅

```javascript
// next.config.ts
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

### 3. Supabase 쿼리 로깅

```typescript
const { data, error } = await supabase.from('tasks').select('*').explain({ analyze: true }) // 쿼리 실행 계획 확인

console.log('Query plan:', data)
```

### 4. VSCode 디버거

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    }
  ]
}
```

---

## 테스트

### 단위 테스트 (예정)

```bash
npm install -D vitest @testing-library/react
```

```typescript
// lib/utils/__tests__/formatDate.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from '../formatDate'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2026-05-18')
    expect(formatDate(date)).toBe('2026년 5월 18일')
  })
})
```

### E2E 테스트 (예정)

```bash
npm install -D playwright
```

---

## 성능 최적화

### 1. Bundle 분석

```bash
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

```bash
ANALYZE=true npm run build
```

### 2. 이미지 최적화

```tsx
import Image from 'next/image'

// ✅ 좋은 예
;<Image
  src="/avatar.jpg"
  alt="User avatar"
  width={100}
  height={100}
  priority // above the fold
/>
```

### 3. Dynamic Import

```typescript
import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('@/components/features/Editor'), {
  ssr: false, // 클라이언트 전용
  loading: () => <Skeleton />,
})
```

---

## 일반적인 문제 해결

### 1. TypeScript 에러

```bash
# 타입 캐시 삭제
rm -rf .next
npm run dev
```

### 2. ESLint 에러 대량 발생

```bash
# 자동 수정
npm run lint:fix
```

### 3. Husky Hook 실패

```bash
# hooks 권한 확인
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### 4. Supabase 연결 실패

```typescript
// lib/supabase/server.ts에서 확인
const supabase = createClient()
const { data, error } = await supabase.from('tasks').select('count')
console.log('Connection test:', { data, error })
```

---

## 유용한 명령어

```bash
# 린트 검사
npm run lint

# 린트 자동 수정
npm run lint:fix

# 포맷팅
npm run format

# 포맷팅 검사
npm run format:check

# 디렉토리 구조 검증
npm run check:structure

# 전체 검사 (린트 + 포맷 + 구조)
npm run check:all

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

---

## IDE 설정

### VSCode 권장 확장 프로그램

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### VSCode 설정

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [React 공식 문서](https://react.dev)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)

---

## 변경 이력

| 날짜       | 버전  | 변경 사항             |
| ---------- | ----- | --------------------- |
| 2026-05-18 | 1.0.0 | 초기 개발 가이드 작성 |
