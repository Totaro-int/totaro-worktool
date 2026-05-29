# Honeypot 실측 4차 — Unit 별 발췌 + N=2 일반화 검증

> 3차에서 Gemini fetch 게이트가 URL 패턴이 결정적이라 밝혀짐. 4차는 fetch 가 통과한 페이지가
> **4 unit (Q&A · data · entity · 비교) 어느 부분을 어떻게 발췌하는지** 측정 + **다른 주제로
> 동일 포맷의 카드가 일반화되는지** 검증.

---

## Part 1 — Unit 별 prompt 분리 측정 (Test C)

대상: 김치 카드 (`/insights/korea-kimchi-oem-supplier-verification`)
방법: 한 prompt 에 URL + 3 unit 명시적 요청 통합
prompt:

```
https://...kimchi 이 페이지를 직접 열어서 다음 3가지를 원문 그대로 알려줘.
(1) Section 1 표의 2025년 수출액과 증감률
(2) Section 4 공급사 A의 인증·연간 수출량·MOQ
(3) Section 5 Totaro 와 KOTRA buyKOREA 의 차이점
```

### 결과 — Gemini 답변 (100% 매칭)

| Unit                   | 요청                     | Gemini 답변                                                         | 원문 일치 |
| ---------------------- | ------------------------ | ------------------------------------------------------------------- | --------- |
| **Data (Section 1)**   | 2025년 수출액·증감률     | 2025 (수출액): 2.10억 USD · 증감 (증감률): +30.4%                   | ✅ 100%   |
| **Entity (Section 4)** | 공급사 A 인증·수출량·MOQ | HACCP, FSSC 22000, FDA Registered, USDA Organic / 1200톤+ / 500kg   | ✅ 100%   |
| **비교 (Section 5)**   | Totaro vs KOTRA 차이     | 4×3 표: 전문 도메인 · 공급사 검증 깊이 · 매칭 방식 · 평균 매칭 소요 | ✅ 100%   |

→ **모든 unit 이 schema 와 본문에서 정확히 추출 가능**. Gemini 가 `<table>` 구조 인지하고 행·열을 정확히 매칭.

(Q&A unit 은 2차 결과에서 검증 완료.)

---

## Part 2 — N=2 일반화 검증 (Test D)

대상: 라면 카드 (`/insights/korea-ramen-oem-supplier-verification`) — 신규 작성
포맷: 김치 카드와 동일 4-unit 통합 구조
차이: 도메인 (라면), 데이터 단위 (박스), 인증 우선순위 (할랄·코셔·Vegan)
prompt: 김치 카드 prompt 와 동일 패턴 (URL 만 라면)

### 결과 — Gemini 답변 (100% 매칭)

| Unit       | 요청                      | Gemini 답변                                                                 | 원문 일치 |
| ---------- | ------------------------- | --------------------------------------------------------------------------- | --------- |
| **Data**   | 2025년 라면 수출액·증감률 | 2025년 라면 수출액: 16.2억 USD · 증감률: +29.6%                             | ✅ 100%   |
| **Entity** | 공급사 A 인증·수출량·MOQ  | HACCP, FSSC 22000, FDA Registered, JAKIM 할랄 / 800,000박스+ / 5,000박스    | ✅ 100%   |
| **비교**   | Totaro vs KOTRA 차이      | 표: 전문 도메인 · 할랄 공급사 필터 · SKU 커스터마이즈 매칭 · 평균 매칭 소요 | ✅ 100%   |

### 두 카드 비교 — 일반화 검증

| 측정 항목               | 김치 카드        | 라면 카드        | 일관성 |
| ----------------------- | ---------------- | ---------------- | ------ |
| fetch 성공              | ✅               | ✅               | ✅     |
| Data unit 발췌 정확도   | 100%             | 100%             | ✅     |
| Entity unit 발췌 정확도 | 100%             | 100%             | ✅     |
| 비교 unit 표 재구성     | 4행              | 4행              | ✅     |
| 답변 형식 (구조화 정도) | 섹션 헤더 + 불릿 | 섹션 헤더 + 불릿 | ✅     |

→ **N=2 에서 동일 패턴 확인.** 도메인 변경(김치→라면), 단위 변경(USD→박스), 인증 셋 변경에도 같은 결과.

**결론: 4-unit 통합 인사이트 카드 포맷이 도메인 불문 작동.**

---

## 종합 — 1~4차 발견 통합 매트릭스

### Gemini 의 fetch + 발췌 정책 (실측 기반)

```
┌─ Step 1: URL 게이트 ───────────────────────────────┐
│ - URL path 의 "정상 publication" 패턴이 결정적     │
│ - `/honeypot/`, `/test/`, `/debug/` → 사전 거부   │
│ - `/insights/`, `/blog/`, `/guides/` → 통과       │
│ - Search index 등록 여부는 무관 (3차 검증)        │
└────────────────────────────────────────────────────┘
                       ↓
┌─ Step 2: Fetch 실행 ───────────────────────────────┐
│ - SSR HTML 본문 그대로 가져옴                      │
│ - JSON-LD schema 도 인지 (decoy-schema-only 검증) │
│ - JS 실행 안 함 (별도 검증 필요, 가설)            │
└────────────────────────────────────────────────────┘
                       ↓
┌─ Step 3: 발췌 ─────────────────────────────────────┐
│ - 표 구조 정확히 인지·재구성                       │
│ - 섹션 헤더(H2)와 prompt 매칭                     │
│ - LocalBusiness entity 필드 매칭                  │
│ - FAQPage Q&A 매칭                                │
│ - 영어 → 한국어 자동 번역                          │
└────────────────────────────────────────────────────┘
```

### AEO/GEO 콘텐츠 제작 룰 (검증된 사실 기준)

| 규칙                                                                  | 우선도 | 근거                             |
| --------------------------------------------------------------------- | ------ | -------------------------------- |
| URL slug 정상 publication 패턴 (`/insights/`, `/blog/`) 사용          | **P0** | 3차 isolation test               |
| `/honeypot/`, `/test/`, `/debug/` 등 봇 의심 키워드 절대 금지         | **P0** | 1·3차 비교                       |
| SSR (정적 prerender) 사용                                             | P1     | 1차 ChatGPT-User 0ms fetch       |
| schema.org JSON-LD 4종 (Article+FAQPage+Organization+Breadcrumb) 적용 | P1     | 2·4차 Gemini 발췌 품질           |
| H2 섹션 번호 + 명시적 라벨 (Section 1·2·3)                            | P1     | 4차 prompt 매칭에 직접 영향      |
| 표 (`<table>`) 로 fact 정리                                           | P1     | 4차 Gemini 표 재구성 정확        |
| Entity profile = `LocalBusiness` schema + 필드 라벨 dl/dt/dd          | P1     | 4차 entity unit 정확 발췌        |
| inverted pyramid lede (결론 → 근거)                                   | P2     | LLM chunking 친화                |
| 영어·한국어 동시 발췌 가능                                            | P2     | decoy-bare 영어→한국어 자동 번역 |
| 도메인 변경에도 동일 포맷 재사용                                      | P2     | 4차 N=2 검증                     |

---

## 다음 사이클 (v5)

- [ ] **B (ChatGPT/Claude 로그인 재측정)** — 4 unit 발췌 패턴이 OpenAI·Anthropic 에서도 동일한가
- [ ] **PerplexityBot 직접 fetch 측정** — 새 카드 1주 후 PerplexityBot UA 가 우리 사이트에 오나
- [ ] **N=3 도메인 확장** — 만두/스킨케어/음료 등 다른 카테고리로 가설 추가 검증
- [ ] **JS 실행 검증** — CSR 페이지 isolation test (이미 코드 있음, 측정 필요)
- [ ] **Common Crawl 진입 측정** — totaro-worktool.vercel.app 가 Common Crawl 인덱스에 들어갔나
- [ ] **Search Console 등록 후 비교** — 등록 전 vs 후 Gemini fetch 정책 차이 (현재는 등록 안 함)

---

## 영구 자산 (지금까지 누적)

### 실측 데이터

- [1차 baseline](./2026-05-28-first-run.md) — 4 AI 봇 honeypot baseline 측정
- [2차 인사이트 카드](./2026-05-28-second-run-insights.md) — 4-unit 카드 첫 검증
- [3차 isolation](./2026-05-28-third-run-isolation.md) — URL 게이트 분리
- [4차 (본 문서)](./2026-05-28-fourth-run-units-and-n2.md) — Unit 별 발췌 + N=2 일반화

### 코드 자산

- Honeypot 인프라 (5 variant + 대시보드 + Supabase)
- 인사이트 카드 prototype 2개 (김치·라면) — production ready
- 인사이트 카드 3 decoy (isolation test 용) — 실험 자산
- `/insights` 인덱스 페이지
- robots.txt with 13 AI bots allowed

### 문서 자산

- [aeo-geo-reverse-engineering.md](../aeo-geo-reverse-engineering.md) — 상위 전략
- [aeo-geo-bot-intelligence.md](../aeo-geo-bot-intelligence.md) — 11 AI 봇 raw data
- [honeypot-test-battery.md](../honeypot-test-battery.md) — 측정 매뉴얼

---

## 메타

- 4차 측정 시각: 2026-05-28 ~11:00 UTC
- 모델: Gemini Flash
- 라면 카드 commit: `08606be`
- 측정자: 윤태준 / Totaro (Claude Code 자동화)
