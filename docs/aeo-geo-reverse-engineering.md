# AEO/GEO Reverse Engineering Playbook

> AI 검색 엔진(ChatGPT·Perplexity·Claude·Gemini·Google AI Overviews)이 실제로 어떻게 query를 처리하고 어떤 출처를 인용하는지 **직접 측정**으로 reverse engineer해, Totaro와 등록 공급사의 AI 노출도를 체계적으로 올린다.

---

## 1. 왜 reverse engineering인가

가설(SEO 가이드 글·블로그 베스트 프랙티스) < 측정(진짜 AI가 뭘 뽑는지). AI 검색 알고리즘은 빠르게 변하고, 한국어/식품/B2B/수출 같은 도메인 특화 신호는 일반 SEO 가이드에 안 나옴. **측정으로 패턴 추출 → 그 패턴에 맞춰 콘텐츠 제작 → 다시 측정**의 loop가 가장 빠른 학습.

---

## 2. AI 검색 엔진별 아키텍처

각 엔진의 underlying tech를 알아야 어디서 무엇을 측정할지 정확해진다.

| 엔진                        | underlying 검색 인프라          | Bot User-Agent                                      | 출처 투명도                         |
| --------------------------- | ------------------------------- | --------------------------------------------------- | ----------------------------------- |
| **ChatGPT Browse / Search** | Bing Search API                 | `ChatGPT-User`, `OAI-SearchBot`, `GPTBot`(training) | 부분적 — citation link로 노출       |
| **Perplexity**              | 자체 인덱스 + Google + Bing API | `PerplexityBot`, `Perplexity-User`                  | **매우 높음** — 출처 박스 전체 공개 |
| **Claude (web search)**     | Brave Search + 기타             | `ClaudeBot`, `Claude-Web`, `anthropic-ai`(training) | 부분적 — citation tag               |
| **Gemini**                  | Google Search native            | `Google-Extended`(training opt-in), `Googlebot`     | 부분적 — grounding sources          |
| **Google AI Overviews**     | Google index + LLM              | `Googlebot`, `Google-Extended`                      | 부분적 — snippet 형태               |

**중요 추론:**

- ChatGPT 노출 = Bing 노출의 직접 함수 → **Bing SEO가 다시 중요**
- Perplexity = 출처 박스 전부 공개 → **reverse engineering의 메인 도구**
- Gemini/AI Overviews = Google index 기반 → **전통 SEO 신호도 여전히 유효**

---

## 3. 8가지 Reverse Engineering 메서드

### Method 1. Citation Source Mapping (가장 기본·필수)

**목적:** 타겟 query에 대해 AI가 어떤 출처(URL·도메인)를 인용하는지 매핑.

**절차:**

1. 타겟 query 20개 정의 (해외 바이어가 진짜 칠 만한 영어 query 위주)
   - 예: `Korean food OEM manufacturer with export support`
   - 예: `find Korean kimchi private label producer`
   - 예: `Korea contract food manufacturer FDA certified`
2. 각 query를 5개 엔진(ChatGPT/Perplexity/Claude/Gemini/Google AI Overviews)에 입력
3. 인용된 URL을 스프레드시트에 기록 — query × 엔진 × 출처 매트릭스
4. 같은 query를 한국어로도 반복 (`한국 김치 OEM 수출 가능한 곳`)

**결과물:** Citation Frequency Sheet — 어떤 도메인이 가장 자주 인용되는지 ranking. → 그 도메인이 "AI가 신뢰하는 출처"의 baseline.

**소요:** 20 query × 5 엔진 × 2 언어 = 200 runs. 평균 2분/run = ~7시간 (1주일 분산 가능).

---

### Method 2. Query Rephrasing Capture

**목적:** 사용자 입력 query를 AI가 내부적으로 어떻게 expand·rephrase하는지 파악.

**왜:** 사용자가 "한국 식품 OEM"이라고 쳐도, AI는 내부적으로 `Korean food OEM manufacturers`, `Korea private label food contract manufacturer`, `Korean food production for export` 등 **여러 query로 expand해서** 검색을 돌린다. 이 expansion 패턴 = 진짜 키워드 셋.

**절차:**

1. Perplexity에 query 입력 → "Searching for: X" 또는 "Sources" 박스 위에 표시되는 실제 실행 query 캡처
2. ChatGPT에는 직접 보이지 않지만 프롬프트로 유도 가능:
   > "What exact search queries did you run to answer this?"
3. 결과를 모아 query expansion 패턴 정리

**결과물:** Real Query Set — 사용자 raw 입력 vs AI 내부 query 매핑. → 콘텐츠 키워드 전략 input.

---

### Method 3. Content Format Pattern Analysis

**목적:** 인용 받는 페이지들이 어떤 **형식·구조·길이**를 갖고 있는지 패턴 추출.

**절차:**

1. Method 1 결과에서 자주 인용되는 URL TOP 30 추출
2. 각 페이지 방문해 다음 기록:
   - 형식 (디렉토리 listicle / Q&A FAQ / 회사 about / 정부 리포트 / 비교 표 / 블로그 글)
   - 글자 수
   - H1/H2 구조
   - 마크다운/구조화 정도 (불릿·표·번호 리스트 비율)
   - Schema.org 마크업 (View Source → `application/ld+json` 검색)
   - 발행 일자 (freshness)
   - 외부 인용·언급 수 (Ahrefs/Semrush)
3. 패턴 클러스터링

**일반적 발견:**

- AI는 **디렉토리/리스트 형식** (Top 10 / Best X / Compared) 강하게 선호
- **Q&A 페이지** (FAQPage schema) 답변 인용에 자주 사용
- **정부·협회 리포트** (KOTRA, aT, 식약처) 높은 권위 점수
- 짧고 정확한 사실 dense한 단락 > 광고/마케팅 카피

**결과물:** Winning Format Spec — Totaro 콘텐츠 제작 시 따라할 템플릿.

---

### Method 4. Schema.org Detection

**목적:** 인용 받는 페이지가 어떤 schema.org 마크업을 사용하는지 식별 → 우리도 동일 적용.

**절차:**

1. URL 방문 → Chrome DevTools → Sources → 페이지 HTML → `application/ld+json` 검색
2. 또는 공식 검증 도구:
   - https://validator.schema.org/ (구조화 데이터 검증)
   - https://search.google.com/test/rich-results (구글 rich result 미리보기)
3. 적용된 schema type 기록

**AEO/GEO에 특히 강한 schema:**
| Schema | 용도 |
|---|---|
| `Organization` | 회사 기본 정보 (이름·주소·로고·소셜) |
| `Product` | 제품 상세 (이름·설명·이미지·가격·재고) |
| `Service` | 서비스 제공 (이름·설명·제공자·지역) |
| `FAQPage` | Q&A 페이지 — AI가 답변 직접 인용에 자주 사용 |
| `HowTo` | 절차/지침 |
| `Article`/`BlogPosting` | 글 메타 (저자·발행일·헤드라인) |
| `Review`/`AggregateRating` | 평점·후기 |
| `LocalBusiness` | 지역 비즈니스 (식품 제조사한테 유효) |

**Totaro 적용:** 공급사 페이지에 `Organization` + `Product` + `Service` 자동 생성. FAQ는 `FAQPage`로 마크업.

---

### Method 5. Bot Traffic Log Analysis (장기 관찰)

**목적:** **자기 사이트에 AI 크롤러가 어떻게 들어오는지** 직접 관찰. 우리 어떤 페이지가 AI에 잡히고 있는지의 1차 신호.

**절차:**

1. Nginx/Cloudflare/Vercel 로그에서 User-Agent 필터링
2. AI bot User-Agent 리스트 (2026 기준):
   ```
   GPTBot                  # OpenAI training crawler
   ChatGPT-User            # ChatGPT in-session browse
   OAI-SearchBot           # OpenAI SearchGPT
   PerplexityBot           # Perplexity training
   Perplexity-User         # Perplexity in-session
   ClaudeBot               # Anthropic
   Claude-Web              # Claude browse mode
   anthropic-ai            # Anthropic training
   Google-Extended         # Gemini training opt-in
   Bingbot                 # Bing (= ChatGPT의 underlying)
   Bytespider              # ByteDance (TikTok AI)
   Meta-ExternalAgent      # Meta AI
   Amazonbot               # Amazon AI
   DuckAssistBot           # DuckDuckGo AI
   ```
3. 어느 페이지·얼마나 자주 크롤되는지 분석
4. **`robots.txt` 정책 검토**: 이들을 허용할지 차단할지 (AEO/GEO 노리려면 허용 필수)

**`robots.txt` 권장 (AEO/GEO 노리는 사이트):**

```
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /
```

차단하면 → AI 학습/색인에서 빠짐 → 영영 인용 안 받음.

---

### Method 6. Competitor Backlink & Authority Forensics

**목적:** Method 1에서 인용 받은 경쟁자 페이지가 **왜** 권위 있는지 신호 분석.

**절차:**

1. 경쟁자 URL을 Ahrefs/Semrush/Moz에 입력
2. 추출 데이터:
   - 도메인 권위 점수 (DR/DA)
   - 백링크 수·출처 도메인 다양성
   - referring domain 들의 권위 점수
   - 앵커 텍스트 패턴
3. 어디서 백링크 받는지 list화 → 우리도 동일 채널에서 백링크 시도

**B2B 식품 수출 도메인에서 자주 등장하는 권위 신호:**

- KOTRA 공식 사이트 인용
- aT(한국농수산식품유통공사) 리포트
- 무역협회(KITA) 출판물
- 식약처(MFDS) 공지
- 정부 보도자료
- 산업통상자원부(MOTIE)
- 학술지 (DBPia, KISS 등)

**결과물:** Authority Building Roadmap — Totaro가 어디서 인용·언급받을지 12개월 계획.

---

### Method 7. AI Memory Probe (학습 데이터 점유율 확인)

**목적:** AI 모델이 우리 브랜드·도메인을 학습 시점에 얼마나 "기억"하고 있는지 측정.

**절차:**

1. 각 AI 엔진에 다음 직접 질문:
   - `Do you know about Totaro?` / `What is Totaro?`
   - `Tell me about Korean food export platforms`
   - 경쟁자 이름도 같이: `Compare Totaro and [경쟁자]`
2. 응답에서 추출:
   - 인지하는가? (Yes/No/Vague)
   - 정확한가? (사실 일치/오류/할루시네이션)
   - 우리가 만든 콘텐츠 인용하는가?

**결과물:** Brand Awareness Baseline. → 시간 경과에 따라 재측정해 우리 콘텐츠 노력이 학습 데이터에 반영되는지 추적 가능.

**주의:** ChatGPT/Claude/Gemini 모두 cut-off date 있음. 학습 cut-off 이후 만든 콘텐츠는 next 모델 업데이트 전까지 학습 안 됨. 단 web search 가능한 모드에선 실시간 검색으로 노출 가능.

---

### Method 8. Common Crawl Trace

**목적:** 대부분 LLM이 학습에 사용하는 Common Crawl 데이터셋에 우리 사이트가 포함됐는지 확인.

**절차:**

1. https://commoncrawl.org/ 방문
2. Index Search: https://index.commoncrawl.org/
3. 우리 도메인 검색 → 어떤 페이지가 언제 크롤됐는지 확인
4. 크롤 안 됐으면 → 사이트맵 제출, robots.txt 점검, 도메인 권위 부족(백링크 적음) 등 원인 파악

**중요:** Common Crawl 미포함 = 차세대 LLM 학습 데이터에서 제외 = AI가 모름. 장기 AEO/GEO 핵심 항목.

---

## 4. 데이터 수집 템플릿 (Google Sheets / Notion DB)

### 시트 1: Citation Source Mapping

| query | language | engine | rank | cited URL | domain | format | snippet 발췌 | 측정일 |
| ----- | -------- | ------ | ---- | --------- | ------ | ------ | ------------ | ------ |

### 시트 2: Content Format Analysis

| URL | domain | 형식 | 글자수 | H2 개수 | schema types | 발행일 | 백링크 수 | 최근 업데이트 |
| --- | ------ | ---- | ------ | ------- | ------------ | ------ | --------- | ------------- |

### 시트 3: Bot Traffic Log (월별 집계)

| 월  | bot UA | unique 페이지 | total hits | 가장 많이 크롤된 페이지 TOP 5 |
| --- | ------ | ------------- | ---------- | ----------------------------- |

### 시트 4: AI Memory Probe (분기별)

| 분기 | engine | "what is Totaro?" 응답 요약 | 정확도 (0-5) | 인용 URL 있나 | 노트 |
| ---- | ------ | --------------------------- | ------------ | ------------- | ---- |

---

## 5. 분석 프레임워크

수집한 데이터에서 다음 질문에 답한다:

1. **어떤 도메인이 가장 자주 인용 받는가?** (top 10 list)
2. **그 도메인의 공통 특성은?** (정부·협회·디렉토리·전문 매체·블로그)
3. **인용 받는 페이지의 공통 형식은?** (listicle·Q&A·about 페이지)
4. **schema.org 마크업 적용률은?** (있음/없음 비율)
5. **freshness 영향은?** (최근 6개월 페이지 비중)
6. **언어별 차이는?** (영어 query vs 한국어 query — 출처 셋이 얼마나 다름)
7. **엔진별 편향은?** (ChatGPT는 Bing 결과, Perplexity는 Reddit/Wikipedia를 더 좋아함 등)

→ 이 답이 **Totaro AEO/GEO 콘텐츠 전략 가이드 v0** 의 본문이 됨.

---

## 6. AEO/GEO 적용 가이드 (측정 → 콘텐츠 → 검증 loop)

```
[Week 1] 측정 (Method 1, 3, 4)
   ↓
[Week 2] 패턴 분석 + 콘텐츠 우선순위 정함
   ↓
[Week 3~4] Top-priority 콘텐츠 5~10편 제작
   - 인용받는 형식으로
   - 필수 schema 마크업 적용
   - 정부·협회 데이터 명시적 인용 (권위 빌리기)
   ↓
[Week 5] 재측정 — 우리 페이지가 citation 받기 시작하는지
   ↓
[Week 6+] 차이 분석 → 다음 콘텐츠 배치 → 반복
```

**KPI:**

- 분기별 AI engine citation 횟수 (target 20 query 기준)
- 우리 사이트의 AI bot crawl 횟수 (월별)
- AI Memory Probe 정확도 점수 (0~5)
- Google AI Overview 노출률 (Semrush AI Overview tracking)

---

## 7. 도구 리스트

### 무료

| 도구                        | 용도                          | URL                                 |
| --------------------------- | ----------------------------- | ----------------------------------- |
| Perplexity                  | 출처 추적 (Method 1·2)        | perplexity.ai                       |
| Brave Search                | Claude underlying 확인        | search.brave.com                    |
| Bing Webmaster Tools        | ChatGPT/Bing 측정             | bing.com/webmasters                 |
| Google Search Console       | Google/Gemini 측정            | search.google.com/search-console    |
| Schema.org Validator        | 마크업 검증                   | validator.schema.org                |
| Rich Results Test           | 구글 rich snippet 미리보기    | search.google.com/test/rich-results |
| Common Crawl Index          | LLM 학습 데이터 포함 여부     | index.commoncrawl.org               |
| AnswerThePublic (free tier) | 진짜 사람들이 묻는 query 발굴 | answerthepublic.com                 |
| Google Trends               | query 트렌드                  | trends.google.com                   |

### 유료 (옵션)

| 도구           | 용도                           | 가격 (2026 기준) |
| -------------- | ------------------------------ | ---------------- |
| Ahrefs         | 백링크·키워드·AI Overview 추적 | 월 ~$129~        |
| Semrush        | 종합 SEO·AI Overview 추적      | 월 ~$140~        |
| Surfer SEO     | 콘텐츠 최적화                  | 월 ~$89~         |
| Screaming Frog | 사이트 크롤 (자체 사이트)      | 연 ~$259~        |
| BrightEdge     | 엔터프라이즈 AEO/GEO           | 견적             |

---

## 8. 윤리·법적 한계

**OK (legal & ethical):**

- AI 엔진에 직접 query 입력해 응답 관찰 (사용자 행동)
- 자체 사이트 로그 분석 (자기 데이터)
- 공개 페이지 방문해 schema 마크업 확인
- Public Common Crawl 인덱스 검색
- 유료 SEO 도구로 경쟁자 백링크 데이터 보기 (그 도구가 라이선스 보유)

**조심 (rate limit·ToS):**

- Perplexity/ChatGPT API 자동 호출 → 각자 rate limit·ToS 준수
- 자동화된 query 측정 시: 사람이 사용하는 페이스로 (분당 1~2회), bot user-agent 정직히 표시

**금지:**

- 경쟁자 사이트 풀 스크래핑 (특히 회원 전용 영역)
- AI 응답 캐시를 무단 재배포
- PII 수집·저장
- robots.txt 무시한 크롤링

---

## 9. 실행 체크리스트 (Totaro 1주일 plan)

- [ ] Day 1: 타겟 query 20개 정의 (영어 + 한국어 각 10개)
- [ ] Day 2~3: Method 1 (Citation Source Mapping) 200 runs
- [ ] Day 4: Method 3 (Content Format Analysis) top 30 URL 분석
- [ ] Day 4: Method 4 (Schema Detection) 동일 30 URL
- [ ] Day 5: Method 7 (AI Memory Probe) — Totaro/경쟁자 인지도 baseline
- [ ] Day 5: Method 8 (Common Crawl trace) — totaro.kr 도메인 포함 여부
- [ ] Day 6: 분석 — Section 5의 7개 질문에 답
- [ ] Day 7: **AEO/GEO 콘텐츠 전략 가이드 v0** 작성 → 다음 분기 콘텐츠 로드맵
- [ ] [장기] Bot Traffic Log 시스템 셋업 — 월별 자동 리포트

---

## 10. 참고 자료

**공식 문서**

- OpenAI bot 정책: https://platform.openai.com/docs/bots
- Anthropic crawler 정책: https://www.anthropic.com/news/responsible-ai-development
- Perplexity bot: https://docs.perplexity.ai/guides/bots
- Google Search Central (AI): https://developers.google.com/search/docs/crawling-indexing/google-special-crawlers
- Schema.org: https://schema.org/

**필독 글**

- "GEO: Generative Engine Optimization" (논문, Aggarwal et al., 2023)
- Princeton AI Search Visibility Study
- Bing Webmaster Blog (AI search 시리즈)

---

## 변경 이력

| 일자       | 변경      | 작성                          |
| ---------- | --------- | ----------------------------- |
| 2026-05-28 | 초안 작성 | 윤태준 / Totaro (with Claude) |
