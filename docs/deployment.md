# 배포 가이드

> **작성일:** 2026-05-18
> **버전:** 1.0.0

## 개요

totaro-worktool은 **Vercel**을 통해 배포됩니다. 이 문서는 배포 프로세스와 환경 설정을 안내합니다.

---

## 사전 요구사항

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com) 대시보드에서 프로젝트 생성
2. SQL 에디터에서 스키마 생성 (`supabase/schema.sql` 실행)
3. Authentication 설정:
   - Email Provider 활성화
   - Site URL 설정 (예: `https://yourdomain.com`)
   - Redirect URLs 추가 (예: `https://yourdomain.com/auth/callback`)

### 2. 환경 변수 준비

다음 값을 Supabase 대시보드에서 확인:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Vercel 배포

### 1. GitHub 연동

```bash
# 1. GitHub 저장소 생성
git remote add origin https://github.com/totaro/worktool.git

# 2. 초기 커밋
git add .
git commit -m "feat: 초기 프로젝트 설정"
git push -u origin main
```

### 2. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com) 로그인
2. "Import Project" 클릭
3. GitHub 저장소 선택
4. Framework Preset: **Next.js** (자동 감지)
5. Root Directory: `/` (기본값)

### 3. 환경 변수 설정

Vercel 프로젝트 설정 → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi... (Production만)
```

**중요:**

- `NEXT_PUBLIC_*` 변수는 모든 환경(Production, Preview, Development)에 추가
- `SUPABASE_SERVICE_ROLE_KEY`는 **Production만** 추가 (보안)

### 4. 배포 트리거

- `main` 브랜치 푸시 시 자동 배포
- Pull Request 시 Preview 배포

---

## 환경별 설정

### Production (프로덕션)

```
NEXT_PUBLIC_SUPABASE_URL = <Production Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <Production Anon Key>
SUPABASE_SERVICE_ROLE_KEY = <Production Service Role Key>
```

### Preview (PR 미리보기)

```
NEXT_PUBLIC_SUPABASE_URL = <Staging Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <Staging Anon Key>
```

**권장:** Staging 전용 Supabase 프로젝트 사용

### Development (로컬)

`.env.local` 파일 (Git 제외):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Local Anon Key>
```

---

## CI/CD 파이프라인

### GitHub Actions (선택)

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## 배포 후 체크리스트

### 1. 기능 검증

- [ ] 홈페이지 접속 확인
- [ ] 회원가입/로그인 테스트
- [ ] 작업 생성/수정/삭제 테스트
- [ ] 문서 생성/수정/삭제 테스트

### 2. 성능 확인

- [ ] Lighthouse 점수 (90+ 목표)
- [ ] Core Web Vitals 확인
- [ ] 이미지 로딩 속도

### 3. 보안 점검

- [ ] 환경 변수 노출 여부 (브라우저 개발자 도구)
- [ ] API 인증 확인
- [ ] CSP 헤더 설정

---

## 롤백

### 즉시 롤백

Vercel 대시보드 → Deployments → 이전 배포 선택 → "Promote to Production"

### Git 롤백

```bash
# 마지막 커밋 되돌리기
git revert HEAD
git push origin main

# 특정 커밋으로 롤백
git revert <commit-hash>
git push origin main
```

---

## 도메인 설정

### 커스텀 도메인 연결

1. Vercel 프로젝트 → Settings → Domains
2. 도메인 입력 (예: `worktool.totaro.com`)
3. DNS 레코드 추가:

```
Type: CNAME
Name: worktool
Value: cname.vercel-dns.com
```

4. SSL 인증서 자동 발급 (Let's Encrypt)

---

## 모니터링

### Vercel Analytics

- 자동 활성화됨
- 페이지 조회, 성능 지표 확인

### Supabase Logs

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 로그 확인
supabase logs --project-ref <project-ref>
```

---

## 트러블슈팅

### 빌드 실패

**증상:** Vercel 빌드 에러

**해결:**

1. 로컬에서 `npm run build` 실행
2. TypeScript 에러 수정
3. 환경 변수 확인 (`process.env.*`)

### 인증 실패

**증상:** 로그인 후 리다이렉트 안 됨

**해결:**

1. Supabase → Authentication → URL Configuration
2. Site URL: `https://yourdomain.com`
3. Redirect URLs: `https://yourdomain.com/auth/callback`

### 404 에러

**증상:** 페이지를 찾을 수 없음

**해결:**

1. `app/` 디렉토리 구조 확인
2. Dynamic Routes 파일명 확인 (`[id]`)
3. Vercel 빌드 로그 확인

---

## 비용 최적화

### Vercel Free Tier

- 월 100GB 대역폭
- 무제한 배포
- 1개 팀 프로젝트

**초과 시:** Pro 플랜 고려 ($20/월)

### Supabase Free Tier

- 500MB 데이터베이스
- 1GB 스토리지
- 50,000 월간 활성 사용자

**초과 시:** Pro 플랜 고려 ($25/월)

---

## 참고 자료

- [Vercel 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Supabase 프로덕션 체크리스트](https://supabase.com/docs/guides/platform/going-into-prod)

---

## 변경 이력

| 날짜       | 버전  | 변경 사항             |
| ---------- | ----- | --------------------- |
| 2026-05-18 | 1.0.0 | 초기 배포 가이드 작성 |
