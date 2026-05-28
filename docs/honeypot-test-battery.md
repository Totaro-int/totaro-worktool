# Honeypot Test Battery — AI 크롤러 실측 매뉴얼

> AEO/GEO Reverse Engineering Playbook · Phase 1 (실측 시작) 의 운영 매뉴얼.
> Honeypot 인프라는 [`aeo-geo-bot-intelligence.md`](./aeo-geo-bot-intelligence.md) 에서 측정 가설을 정의했고, 본 문서는 그 가설을 **실제 봇 트래픽으로 검증**하는 절차서.

---

## 0. 사전 준비 (1회만)

1. **Supabase 테이블 생성**

   ```sql
   -- Supabase Dashboard → SQL Editor 에 supabase/honeypot.sql 전체 붙여넣고 RUN
   ```

2. **Service role 키 설정**
   `.env.local` 에 추가:

   ```
   SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
   ```

   Supabase Dashboard → Settings → API → `service_role` 키 복사.

3. **Vercel 배포**

   ```bash
   git add -A && git commit -m "feat: honeypot infrastructure"
   git push   # Vercel 자동 배포
   ```

   Vercel Dashboard → Environment Variables 에도 `SUPABASE_SERVICE_ROLE_KEY` 추가.

4. **배포 URL 확인**
   배포된 도메인을 메모. 예: `https://totaro-worktool.vercel.app`.
   이하 본 문서에서 `{BASE}` 로 표기.

5. **첫 sanity check**
   브라우저로 직접 방문:
   - `{BASE}/honeypot/baseline/test001`
   - `{BASE}/robots.txt`
   - `{BASE}/admin/honeypot` (로그인 필요)

   대시보드에서 본인 브라우저 hit 가 보이면 인프라 OK.

---

## 1. 테스트별 prompt + 기대 결과

테스트 1건당:

1. honeypot URL 생성 — `id` 는 매번 고유하게 (예: `test001`, `t-2025-05-28-01`, ULID 등)
2. AI 에 prompt 던지기 (아래 표 참고)
3. AI 응답 캡처
4. 대시보드 새로고침 → hit 확인
5. 결과 기록

### Test 1 — Baseline: 누가 실제로 fetch 하나

**URL:** `{BASE}/honeypot/baseline/<id>`
**Prompt (4개 AI 에 동일):**

```
다음 페이지의 핵심 내용을 한 줄로 요약해줘:
{BASE}/honeypot/baseline/<id>
```

| AI         | UA 로 식별 후 기대                            |
| ---------- | --------------------------------------------- |
| ChatGPT    | `ChatGPT-User`                                |
| Perplexity | `Perplexity-User` (사용자 트리거 fetcher)     |
| Claude     | `Claude-User`                                 |
| Gemini     | `Google-NotebookLM` 또는 Google 사용자 트리거 |

**기록할 것:**

- 어느 UA 가 등장했나 (대시보드 → 봇별 hit 표)
- 응답 시간 (response_ms)
- AI 답변에 marker code 가 들어갔나? (들어갔으면 = 본문 읽음 확인)

---

### Test 2 — IP 검증: 진짜 OpenAI/Anthropic 인가

Test 1 결과의 IP 를 공식 JSON 과 대조.

| 봇                          | 공식 IP JSON                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- |
| GPTBot                      | `https://openai.com/gptbot.json`                                                      |
| ChatGPT-User                | `https://openai.com/chatgpt-user.json`                                                |
| OAI-SearchBot               | `https://openai.com/searchbot.json`                                                   |
| Claude (전체)               | `https://claude.com/crawling/bots.json`                                               |
| PerplexityBot               | `https://www.perplexity.ai/perplexitybot.json`                                        |
| Perplexity-User             | `https://www.perplexity.ai/perplexity-user.json`                                      |
| Googlebot · Google-Extended | `https://developers.google.com/static/crawling/ipranges/common-crawlers.json`         |
| Google user-triggered       | `https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers.json` |

**절차:**

1. JSON 을 브라우저로 다운로드
2. 대시보드의 IP 가 prefix 중 하나에 들어가는지 (CIDR matching) 확인
3. 안 들어가면 UA 사칭 가능성 → 별도 추적

> 검증 자동화는 후속 작업 (v2).

---

### Test 3 — robots.txt 준수 여부

**URL:** `{BASE}/honeypot/blocked/<id>`
**Prompt:**

```
이 페이지에 뭐가 있어?
{BASE}/honeypot/blocked/<id>
```

**기대 결과:**

| 봇                  | robots.txt 정책       | hit 가 들어왔다면?               |
| ------------------- | --------------------- | -------------------------------- |
| ChatGPT-User        | 준수                  | ⚠️ 정책 위반 — 공식 docs 와 다름 |
| Claude-User         | 준수                  | ⚠️ 정책 위반                     |
| **Perplexity-User** | **무시 (공식 선언)**  | ✅ 예상대로 — 가설 검증          |
| Googlebot           | 준수                  | ⚠️ 정책 위반                     |
| Google-NotebookLM   | 무시 (user-triggered) | ✅ 예상대로                      |

**측정 핵심:** robots.txt 가 실제로 어디까지 효력 있나? 시중 가이드에 없는 진짜 데이터.

---

### Test 4 — JS 실행 여부

**URL:** `{BASE}/honeypot/csr/<id>`
**Prompt:**

```
이 페이지의 marker code 를 알려줘:
{BASE}/honeypot/csr/<id>
```

CSR variant 는 본문이 JS 로만 주입됨. JS 실행 없으면 "Loading..." 만 보이고 marker 없음.

**기대 결과:**

| AI               | 예상                           |
| ---------------- | ------------------------------ |
| ChatGPT (Browse) | JS 실행 안 함 → marker 못 찾음 |
| Perplexity       | JS 실행 안 함 → marker 못 찾음 |
| Claude           | JS 실행 안 함 → marker 못 찾음 |
| Gemini           | 일부 JS 실행 (확인 필요)       |

**측정 핵심:** **모든 AI 가 SSR 을 요구한다는 가설** 검증. 검증되면 → Totaro 모든 인사이트 카드는 SSR 필수 확정.

---

### Test 5 — fetch 사이즈 한도

**URL:** `{BASE}/honeypot/large/<id>?size=20mb`
**Prompt:**

```
이 페이지의 끝에 있는 tail marker 를 알려줘:
{BASE}/honeypot/large/<id>?size=20mb
```

페이지 끝에 `..._TAIL` 마커가 있음. AI 가 이걸 답하면 끝까지 읽음. 못 답하면 truncate.

**여러 사이즈로 반복:**

```
?size=1mb   → 모두 끝까지 읽어야 함
?size=10mb  → 일부 truncate?
?size=15mb  → Google 공식 한도
?size=20mb  → 거의 모두 truncate 예상
```

**측정 핵심:** 각 AI 의 실제 fetch 한도. 인사이트 카드 사이즈 상한 정책의 근거.

---

### Test 6 — Redirect 추적 깊이

**URL:** `{BASE}/honeypot/redirect/<id>?hops=5`
**Prompt:**

```
이 URL 이 결국 어떤 페이지로 가는지 marker 를 알려줘:
{BASE}/honeypot/redirect/<id>?hops=5
```

5단 redirect 후 본문. 대시보드에서 어느 hop 까지 hit 가 찍히는지 확인.

**기대값:**

- 일반적으로 봇은 5단 정도까지 따라감
- 10단 이상은 따라가는 봇 적음

```
?hops=2  → 다 따라감
?hops=5  → 일부 봇 멈춤?
?hops=10 → 다수 봇 멈춤
```

**측정 핵심:** Totaro 공급사 URL 리다이렉트 정책의 안전 한도.

---

### Test 7 — 캐싱 / 재fetch 정책

**Prompt (같은 AI 에 5번 반복):**

```
{BASE}/honeypot/baseline/<id> 요약해줘
```

동일 세션 / 다른 세션에서 반복.

**대시보드에서 확인:**

- hit 가 5번 들어왔나, 아니면 1번만?
- 들어온 시간 간격은?

**측정 핵심:** AI 가 자체 캐시를 갖나, 매번 fresh fetch 하나. AEO 관점에서 콘텐츠 업데이트 후 반영 속도의 근거.

---

## 2. 결과 기록 템플릿 (각 테스트당)

테스트별로 다음 정보를 별도 문서 (`docs/honeypot-results/<date>.md`) 에 기록:

```markdown
## Test N — <테스트 이름>

- 일시: 2026-05-28 16:30
- AI: ChatGPT (모델: GPT-4o)
- 사용한 honeypot id: <id>
- prompt:
  > <복사>
- AI 응답 (요약 또는 캡처):
  > <복사>
- 대시보드 결과:
  - hit UA: ChatGPT-User
  - hit IP: 23.x.x.x (✅ openai.com/chatgpt-user.json 의 prefix 내)
  - response_ms: 87ms
  - 답변에 marker 포함: ✅
- 발견:
  - <한 줄로 인사이트>
```

---

## 3. 분기별 데이터 정합성 체크

- [ ] (분기별) 11개 봇 IP JSON 의 `creationTime` 갱신 확인
- [ ] (분기별) 동일 prompt 셋으로 재측정 — 봇 행동이 바뀌었나
- [ ] (분기별) 새 봇 UA 등장 — `lib/honeypot/identify.ts` 업데이트

---

## 4. 다음 단계 (v2)

- [ ] IP-CIDR 자동 매칭 (공식 JSON 로딩 → 대시보드에 ✅/❌ 컬럼)
- [ ] 봇별·variant별 시계열 차트
- [ ] honeypot URL 생성기 (대시보드에서 새 ID + prompt 자동 발급)
- [ ] AI 응답 자동 캡처 (Playwright + Perplexity API)
- [ ] 결과 마크다운 자동 export

---

## 5. 관련 문서

- [`aeo-geo-reverse-engineering.md`](./aeo-geo-reverse-engineering.md) — 상위 전략 문서
- [`aeo-geo-bot-intelligence.md`](./aeo-geo-bot-intelligence.md) — 11개 봇 raw data
- 인프라 코드:
  - `lib/honeypot/` — 로거 · 식별 · 템플릿
  - `app/honeypot/` — 5개 variant 라우트
  - `app/(app)/admin/honeypot/` — 대시보드
  - `app/robots.ts` — AI 봇 정책
  - `supabase/honeypot.sql` — 테이블
