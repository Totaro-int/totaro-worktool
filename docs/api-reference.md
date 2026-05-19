# API 명세서

> **작성일:** 2026-05-18
> **버전:** 1.0.0

## 개요

totaro-worktool은 주로 **Server Actions**를 사용하며, 일부 기능에서만 API Routes를 사용합니다.

## Server Actions

### 인증 (app/auth/actions.ts)

#### signIn

사용자 로그인

```typescript
async function signIn(formData: FormData): Promise<{ error?: string }>

// 사용 예시
<form action={signIn}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">로그인</button>
</form>
```

**Parameters:**

- `formData.email`: 이메일 주소
- `formData.password`: 비밀번호

**Returns:**

- `{ error: string }`: 실패 시 에러 메시지
- `void`: 성공 시 리다이렉트

---

#### signUp

사용자 회원가입

```typescript
async function signUp(formData: FormData): Promise<{ error?: string }>
```

**Parameters:**

- `formData.email`: 이메일 주소
- `formData.password`: 비밀번호 (최소 8자)
- `formData.name`: 사용자 이름

---

#### signOut

로그아웃

```typescript
async function signOut(): Promise<void>
```

---

### 작업 관리 (app/(app)/tasks/actions.ts)

#### createTask

새 작업 생성

```typescript
async function createTask(formData: FormData): Promise<void>
```

**Parameters:**

- `formData.title`: 작업 제목 (필수)
- `formData.description`: 작업 설명 (선택)
- `formData.due_date`: 마감일 (선택, ISO 8601)
- `formData.priority`: 우선순위 ('low' | 'medium' | 'high')

**Throws:**

- 인증 실패
- 필수 필드 누락
- 데이터베이스 에러

---

#### updateTask

작업 수정

```typescript
async function updateTask(taskId: string, formData: FormData): Promise<void>
```

**Parameters:**

- `taskId`: 작업 ID (UUID)
- `formData.title`: 작업 제목
- `formData.description`: 작업 설명
- `formData.status`: 상태 ('todo' | 'in_progress' | 'done')

---

#### deleteTask

작업 삭제

```typescript
async function deleteTask(taskId: string): Promise<void>
```

**Parameters:**

- `taskId`: 삭제할 작업 ID (UUID)

---

#### toggleTaskStatus

작업 완료 상태 토글

```typescript
async function toggleTaskStatus(taskId: string): Promise<void>
```

---

### 문서 관리 (app/(app)/documents/actions.ts)

#### createDocument

새 문서 생성

```typescript
async function createDocument(formData: FormData): Promise<string>
```

**Parameters:**

- `formData.title`: 문서 제목
- `formData.content`: 문서 내용 (Markdown)

**Returns:**

- 생성된 문서 ID (UUID)

---

#### updateDocument

문서 수정

```typescript
async function updateDocument(documentId: string, formData: FormData): Promise<void>
```

---

#### deleteDocument

문서 삭제

```typescript
async function deleteDocument(documentId: string): Promise<void>
```

---

### 대시보드 (app/(app)/dashboard/actions.ts)

#### getStats

대시보드 통계 조회

```typescript
async function getStats(): Promise<DashboardStats>

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalDocuments: number
  recentActivities: Activity[]
}
```

---

## API Routes

### 파일 업로드

#### POST /api/upload

파일을 Supabase Storage에 업로드

```typescript
// Request
POST /api/upload
Content-Type: multipart/form-data

{
  file: File
  bucket: 'avatars' | 'documents' | 'attachments'
}

// Response
{
  url: string
  path: string
}
```

**최대 파일 크기:** 10MB
**허용 형식:** 이미지 (jpg, png, webp), 문서 (pdf, docx)

---

### 검색

#### GET /api/search

전체 검색

```typescript
// Request
GET /api/search?q=keyword&type=tasks&limit=10

// Response
{
  results: Array<{
    id: string
    type: 'task' | 'document' | 'user'
    title: string
    snippet: string
    url: string
  }>
  total: number
}
```

**Query Parameters:**

- `q`: 검색 키워드 (필수)
- `type`: 검색 대상 ('tasks' | 'documents' | 'all')
- `limit`: 결과 개수 (기본: 20, 최대: 100)

---

## 에러 코드

모든 Server Actions는 에러 발생 시 `throw`합니다. 클라이언트에서 `try-catch` 또는 Error Boundary로 처리하십시오.

### 공통 에러

| 코드               | 메시지                      | 설명                   |
| ------------------ | --------------------------- | ---------------------- |
| `UNAUTHENTICATED`  | 인증이 필요합니다           | 로그인하지 않은 사용자 |
| `FORBIDDEN`        | 권한이 없습니다             | 접근 권한 부족         |
| `NOT_FOUND`        | 리소스를 찾을 수 없습니다   | 존재하지 않는 데이터   |
| `VALIDATION_ERROR` | 입력 값이 올바르지 않습니다 | 필드 검증 실패         |

---

## 사용 예시

### 작업 생성 (Client Component)

```typescript
'use client'

import { createTask } from './actions'
import { useState } from 'react'

export function TaskForm() {
  const [error, setError] = useState<string>()

  async function handleSubmit(formData: FormData) {
    try {
      await createTask(formData)
      // 성공 처리
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form action={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

### 데이터 페칭 (Server Component)

```typescript
// app/(app)/tasks/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  return <TaskList tasks={tasks} />
}
```

---

## 변경 이력

| 날짜       | 버전  | 변경 사항          |
| ---------- | ----- | ------------------ |
| 2026-05-18 | 1.0.0 | 초기 API 명세 작성 |
