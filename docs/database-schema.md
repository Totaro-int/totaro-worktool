# 데이터베이스 스키마

> **작성일:** 2026-05-18
> **버전:** 1.0.0
> **DBMS:** PostgreSQL 15 (Supabase)

## ERD 다이어그램

```
┌──────────────────┐       ┌──────────────────┐
│  auth.users      │───┐   │  public.tasks    │
│ (Supabase Auth)  │   │   ├──────────────────┤
└──────────────────┘   │   │ id (PK)          │
                       └───│ user_id (FK)     │
┌──────────────────┐       │ title            │
│ public.documents │       │ description      │
├──────────────────┤       │ status           │
│ id (PK)          │       │ priority         │
│ user_id (FK)     │       │ due_date         │
│ title            │       │ created_at       │
│ content          │       │ updated_at       │
│ created_at       │       └──────────────────┘
│ updated_at       │
└──────────────────┘       ┌──────────────────┐
                           │ public.profiles  │
                           ├──────────────────┤
                           │ id (PK, FK)      │
                           │ username         │
                           │ full_name        │
                           │ avatar_url       │
                           │ created_at       │
                           │ updated_at       │
                           └──────────────────┘
```

---

## 테이블 정의

### 1. auth.users (Supabase 관리)

사용자 인증 정보 (Supabase Auth가 자동 관리)

| 컬럼                 | 타입        | 제약             | 설명              |
| -------------------- | ----------- | ---------------- | ----------------- |
| `id`                 | uuid        | PK               | 사용자 고유 ID    |
| `email`              | varchar     | UNIQUE, NOT NULL | 이메일 주소       |
| `encrypted_password` | varchar     | NOT NULL         | 암호화된 비밀번호 |
| `created_at`         | timestamptz | NOT NULL         | 가입일시          |
| `updated_at`         | timestamptz | NOT NULL         | 수정일시          |

---

### 2. public.profiles

사용자 프로필 정보 (확장 테이블)

| 컬럼         | 타입         | 제약                    | 설명              |
| ------------ | ------------ | ----------------------- | ----------------- |
| `id`         | uuid         | PK, FK → auth.users(id) | 사용자 ID         |
| `username`   | varchar(50)  | UNIQUE                  | 사용자명 (닉네임) |
| `full_name`  | varchar(100) |                         | 실명              |
| `avatar_url` | text         |                         | 프로필 이미지 URL |
| `created_at` | timestamptz  | DEFAULT now()           | 생성일시          |
| `updated_at` | timestamptz  | DEFAULT now()           | 수정일시          |

**인덱스:**

- `idx_profiles_username` ON `username`

**트리거:**

- `handle_new_user`: auth.users 생성 시 자동으로 profiles 생성
- `handle_updated_at`: 수정 시 updated_at 자동 갱신

**RLS (Row Level Security):**

```sql
-- 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

### 3. public.tasks

작업(Task) 관리 테이블

| 컬럼          | 타입          | 제약                          | 설명      |
| ------------- | ------------- | ----------------------------- | --------- |
| `id`          | uuid          | PK, DEFAULT gen_random_uuid() | 작업 ID   |
| `user_id`     | uuid          | FK → auth.users(id), NOT NULL | 작성자 ID |
| `title`       | varchar(200)  | NOT NULL                      | 작업 제목 |
| `description` | text          |                               | 작업 설명 |
| `status`      | task_status   | DEFAULT 'todo'                | 상태      |
| `priority`    | task_priority | DEFAULT 'medium'              | 우선순위  |
| `due_date`    | date          |                               | 마감일    |
| `created_at`  | timestamptz   | DEFAULT now()                 | 생성일시  |
| `updated_at`  | timestamptz   | DEFAULT now()                 | 수정일시  |

**Enum 타입:**

```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
```

**인덱스:**

- `idx_tasks_user_id` ON `user_id`
- `idx_tasks_status` ON `status`
- `idx_tasks_due_date` ON `due_date`

**트리거:**

- `handle_updated_at`: 수정 시 updated_at 자동 갱신

**RLS:**

```sql
-- 자신의 작업만 조회 가능
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

-- 자신의 작업만 생성 가능
CREATE POLICY "Users can create own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 자신의 작업만 수정/삭제 가능
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);
```

---

### 4. public.documents

문서 관리 테이블

| 컬럼         | 타입         | 제약                          | 설명                 |
| ------------ | ------------ | ----------------------------- | -------------------- |
| `id`         | uuid         | PK, DEFAULT gen_random_uuid() | 문서 ID              |
| `user_id`    | uuid         | FK → auth.users(id), NOT NULL | 작성자 ID            |
| `title`      | varchar(200) | NOT NULL                      | 문서 제목            |
| `content`    | text         |                               | 문서 내용 (Markdown) |
| `created_at` | timestamptz  | DEFAULT now()                 | 생성일시             |
| `updated_at` | timestamptz  | DEFAULT now()                 | 수정일시             |

**인덱스:**

- `idx_documents_user_id` ON `user_id`
- `idx_documents_title` ON `title` (전문 검색용)

**트리거:**

- `handle_updated_at`: 수정 시 updated_at 자동 갱신

**RLS:**

```sql
-- 자신의 문서만 조회/생성/수정/삭제 가능
CREATE POLICY "Users can manage own documents"
ON documents FOR ALL
USING (auth.uid() = user_id);
```

---

## 함수 및 트리거

### 1. handle_updated_at

모든 테이블의 `updated_at` 자동 갱신

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 2. handle_new_user

신규 사용자 가입 시 프로필 자동 생성

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),  -- 이메일 앞부분을 기본 username으로
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 스키마 마이그레이션

### 초기 스키마 생성

`supabase/schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username varchar(50) UNIQUE,
  full_name varchar(100),
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  status task_status DEFAULT 'todo' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  due_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create documents table
CREATE TABLE public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title varchar(200) NOT NULL,
  content text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);

-- Create functions and triggers (위 참조)

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (위 참조)
```

### 마이그레이션 적용

```bash
# Supabase CLI 사용
supabase db reset  # 개발 환경
```

---

## 백업 및 복구

### 백업

```bash
# Supabase 대시보드에서 자동 백업 활성화
# 또는 수동 백업
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### 복구

```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## 변경 이력

| 날짜       | 버전  | 변경 사항        |
| ---------- | ----- | ---------------- |
| 2026-05-18 | 1.0.0 | 초기 스키마 정의 |

---

## 참고 자료

- [Supabase Database 문서](https://supabase.com/docs/guides/database)
- [PostgreSQL RLS 문서](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
