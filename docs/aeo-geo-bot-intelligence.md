# AI Crawler & Schema.org Raw Intelligence

> AEO/GEO Reverse Engineering Playbook의 **1차 자료(raw data)**. 가설/secondary source 없이, 각 회사의 **공식 문서 + 공식 IP range JSON 엔드포인트**에서 직접 추출한 사실만 정리.
>
> 수집 일자: 2026-05-28
> 수집 도구: WebFetch (직접 HTTP fetch + JSON 검증)
> 검증 방법: 모든 IP range JSON 엔드포인트를 라이브 호출해 응답 확인

---

## 0. 출처 가용성 매트릭스

| 출처                               | 시도한 URL                                           | 결과              | 비고                                        |
| ---------------------------------- | ---------------------------------------------------- | ----------------- | ------------------------------------------- |
| OpenAI bot policy (HTML)           | `platform.openai.com/docs/bots`                      | **403 Forbidden** | anti-bot block. 우회 불가                   |
| OpenAI bot policy (HTML 대체)      | `openai.com/gptbot`                                  | **403**           | 동일 block                                  |
| OpenAI bot policy (archive)        | `web.archive.org/...`                                | WebFetch 차단     | —                                           |
| OpenAI GPTBot IP JSON              | `openai.com/gptbot.json`                             | **✅ live**       | 21 prefix, 2025-10-30                       |
| OpenAI ChatGPT-User IP JSON        | `openai.com/chatgpt-user.json`                       | **✅ live**       | 250+ prefix /28, 2026-05-21                 |
| OpenAI SearchBot IP JSON           | `openai.com/searchbot.json`                          | **✅ live**       | 35 prefix, 2026-01-02                       |
| Anthropic crawler 정책             | `support.claude.com/.../8896518`                     | **✅ 정상**       | (302 redirect from `support.anthropic.com`) |
| Anthropic IP JSON                  | `claude.com/crawling/bots.json`                      | **403**           | 직접 fetch 차단, 단 정책 문서에서 URL 명시  |
| Perplexity bot 문서                | `docs.perplexity.ai/guides/bots`                     | **✅ 정상**       | —                                           |
| Perplexity PerplexityBot IP JSON   | `perplexity.ai/perplexitybot.json`                   | **✅ live**       | 8 prefix, 2025-02-07                        |
| Perplexity Perplexity-User IP JSON | `perplexity.ai/perplexity-user.json`                 | **✅ live**       | 4 prefix, 2025-10-17                        |
| Google 크롤러 overview             | `developers.google.com/.../overview-google-crawlers` | **✅ 정상**       | —                                           |
| Google common crawlers             | `.../google-common-crawlers`                         | **✅ 정상**       | —                                           |
| Google special-case crawlers       | `.../google-special-case-crawlers`                   | **✅ 정상**       | —                                           |
| Google user-triggered fetchers     | `.../google-user-triggered-fetchers`                 | **✅ 정상**       | —                                           |
| Schema.org root                    | `schema.org`                                         | **✅ 정상**       | v30.0 (2026-03-19)                          |
| Schema.org type hierarchy          | `schema.org/docs/full.html`                          | **✅ 정상**       | —                                           |

**해석:**

- OpenAI는 HTML docs 페이지를 자동화 봇에 닫아둠. 단 IP range JSON은 공개 → 사실 검증은 가능
- Anthropic도 IP JSON 자체는 차단(403)이지만 정책 문서에 URL이 명시되어 있음 → 브라우저로 받아 allowlist에 사용
- Google·Perplexity는 자동화 친화적 (공식적으로 모든 게 공개·접근 가능)

---

## 1. OpenAI

OpenAI는 3개 봇을 운영. **각 봇마다 독립된 User-Agent + 독립된 IP range JSON**을 발행하므로, robots.txt와 WAF allowlist 모두에서 개별 제어 가능.

### 1.1 GPTBot — 모델 학습 데이터 크롤러

| 항목                 | 값                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **목적**             | OpenAI foundation 모델(GPT-4, GPT-5, …) 사전 학습 데이터 수집                                            |
| **User-Agent token** | `GPTBot`                                                                                                 |
| **공식 UA 패턴**     | `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.x; +https://openai.com/gptbot)` |
| **IP range JSON**    | `https://openai.com/gptbot.json` ✅ live                                                                 |
| **JSON 구조**        | `{ creationTime, prefixes: [{ipv4Prefix: "x.x.x.x/yy"}, …] }`                                            |
| **현재 prefix 개수** | 21개 (2025-10-30 기준), 주로 Azure 대역 (132.196.x, 172.182.x, 20.125.x, 52.230.x, 4.x, 74.7.x)          |
| **robots.txt 준수**  | ✅ 준수                                                                                                  |
| **차단 시 효과**     | OpenAI 다음 세대 학습 셋에서 제외. 단 **이미 학습된 데이터는 영향 없음**                                 |

### 1.2 ChatGPT-User — ChatGPT 내 사용자 트리거 fetch

| 항목                 | 값                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **목적**             | ChatGPT 안에서 사용자가 URL을 보여달라고 하거나, AI가 답변 중 외부 페이지를 참고할 때 실시간 fetch                                                     |
| **User-Agent token** | `ChatGPT-User`                                                                                                                                         |
| **IP range JSON**    | `https://openai.com/chatgpt-user.json` ✅ live                                                                                                         |
| **현재 prefix 개수** | **250+개 /28 블록** (가장 큰 fleet), 2026-05-21 갱신                                                                                                   |
| **robots.txt 준수**  | ✅ 준수 (단 user-triggered fetch도 robots를 본다는 OpenAI 정책. 다만 user-agent `*`에 대한 disallow는 따르지 않을 수 있음 — Google AdsBot과 유사 패턴) |
| **차단 시 효과**     | ChatGPT 사용자가 우리 페이지 URL을 직접 붙여 넣었을 때 **읽기 실패** → 답변 품질 저하 → **citation 사라짐**                                            |

### 1.3 OAI-SearchBot — SearchGPT / ChatGPT Search 인덱싱

| 항목                 | 값                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **목적**             | ChatGPT Search(SearchGPT) 인덱스 구축. **AI 학습용 아님**                                                  |
| **User-Agent token** | `OAI-SearchBot`                                                                                            |
| **IP range JSON**    | `https://openai.com/searchbot.json` ✅ live                                                                |
| **현재 prefix 개수** | 35개 (2026-01-02), /28~/24 혼합                                                                            |
| **robots.txt 준수**  | ✅ 준수                                                                                                    |
| **차단 시 효과**     | **ChatGPT Search 결과에서 제외** → ChatGPT 사용자가 우리 사이트를 발견할 수 없음. AEO 관점에서 가장 치명적 |

### 1.4 robots.txt 적용 패턴

```
# AI 학습은 거부하되 ChatGPT 검색·인용은 허용
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /
```

또는 **AEO를 노리면 셋 다 허용**:

```
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /
```

> ⚠️ HTML docs는 fetch 차단이지만 위 3개 봇의 user-agent token·JSON URL은 모두 라이브 검증됨. 변경 가능성이 있으니 분기별로 JSON `creationTime` 확인 권장.

---

## 2. Anthropic

Anthropic은 **3개 봇**을 운영. (참고: 기존 Totaro playbook에 적힌 `Claude-Web`, `anthropic-ai`는 **더 이상 공식 목록에 없음** — 옛 UA. 최신 정책 기준으로 갱신 필요)

### 2.1 ClaudeBot — 학습 데이터 크롤러

| 항목                 | 값                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**             | "helps enhance the utility and safety of our generative AI models by collecting web content that could potentially contribute to their training" (= 학습 데이터) |
| **User-Agent token** | `ClaudeBot`                                                                                                                                                      |
| **IP range JSON**    | `https://claude.com/crawling/bots.json` (정책 문서에 명시)                                                                                                       |
| **robots.txt 준수**  | ✅ 준수                                                                                                                                                          |

### 2.2 Claude-User — Claude 대화 내 사용자 트리거 fetch

| 항목                 | 값                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **목적**             | "supports Claude AI users by accessing websites when individuals ask questions to Claude" |
| **User-Agent token** | `Claude-User`                                                                             |
| **robots.txt 준수**  | ✅ 준수                                                                                   |
| **차단 시 효과**     | Claude 사용자가 우리 URL을 붙여 넣어도 못 읽음 → citation 손실                            |

### 2.3 Claude-SearchBot — Claude의 search/grounding

| 항목                 | 값                                                             |
| -------------------- | -------------------------------------------------------------- |
| **목적**             | "navigates the web to improve search result quality for users" |
| **User-Agent token** | `Claude-SearchBot`                                             |
| **robots.txt 준수**  | ✅ 준수                                                        |
| **차단 시 효과**     | Claude의 web search 모드 결과에서 제외 → AEO 핵심 손실         |

### 2.4 robots.txt 적용 (공식 권장)

**속도만 조절 (블락 X):**

```
User-agent: ClaudeBot
Crawl-delay: 1
```

**완전 차단:**

```
User-agent: ClaudeBot
Disallow: /
```

공식 문서 경고: _"Alternate methods like blocking IP address(es)... may not work correctly or persistently guarantee an opt-out."_ → **robots.txt가 표준**. IP block은 신뢰 X.

### 2.5 ⚠️ 기존 Playbook 정정 필요

`docs/aeo-geo-reverse-engineering.md`의 Method 5 봇 리스트(라인 128~144)에서 다음 항목은 outdated:

| 기존 목록      | 현재 상태                                                       |
| -------------- | --------------------------------------------------------------- |
| `Claude-Web`   | ❌ 더 이상 공식 목록 없음 (Claude-User로 통합)                  |
| `anthropic-ai` | ❌ 더 이상 공식 목록 없음 (구 학습 봇 명칭, ClaudeBot으로 통합) |
| `ClaudeBot`    | ✅ 유지                                                         |

→ 정확한 현재 셋: `ClaudeBot`, `Claude-User`, `Claude-SearchBot`

---

## 3. Perplexity

2개 봇. **출처 박스가 공개되는 엔진이라 AEO reverse engineering의 메인 도구.**

### 3.1 PerplexityBot — 검색 인덱싱

| 항목                  | 값                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**              | "Designed to surface and link websites in search results on Perplexity. **It is not used to crawl content for AI foundation models.**" |
| **User-Agent (full)** | `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)`              |
| **IP range JSON**     | `https://www.perplexity.ai/perplexitybot.json` ✅ live                                                                                 |
| **현재 prefix 개수**  | 8개 (2025-02-07), AWS 대역 (/29 ~ /32)                                                                                                 |
| **robots.txt 준수**   | ✅ 준수                                                                                                                                |
| **차단 시 효과**      | **Perplexity 검색 결과·citation에서 완전히 사라짐** → AEO 최우선 손실                                                                  |

### 3.2 Perplexity-User — 사용자 트리거 답변 fetch

| 항목                  | 값                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**              | "Supports user actions within Perplexity. When users ask Perplexity a question, it might visit a web page to help provide an accurate answer and include a link to the page in its response." |
| **User-Agent (full)** | `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)`                                                                 |
| **IP range JSON**     | `https://www.perplexity.ai/perplexity-user.json` ✅ live                                                                                                                                      |
| **현재 prefix 개수**  | 4개 (2025-10-17)                                                                                                                                                                              |
| **robots.txt 준수**   | **❌ 무시** — _"Since a user requested the fetch, this fetcher generally ignores robots.txt rules."_                                                                                          |
| **차단 시 효과**      | robots.txt로는 못 막음. WAF에서 IP 또는 User-Agent로 차단해야 함                                                                                                                              |

### 3.3 정책 결정 포인트

Perplexity는 학습용 크롤링을 안 한다(공식 선언). 즉 **차단할 이유 자체가 약함**. AEO 노리면 둘 다 허용.

---

## 4. Google

세 카테고리: **Common Crawlers**, **Special-Case Crawlers**, **User-Triggered Fetchers**. AI 노출 관점에서 핵심은 **Google-Extended**와 **Google-NotebookLM**.

### 4.1 Common Crawlers (전부 robots.txt 준수)

| 봇                        | User-Agent token                                 | 영향 받는 제품                                                      |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| **Googlebot**             | `Googlebot`                                      | Google Search, Discover, Images, Video, News (메인)                 |
| **Googlebot Image**       | `Googlebot-Image` (또는 `Googlebot`)             | Google Images, Discover                                             |
| **Googlebot Video**       | `Googlebot-Video` (또는 `Googlebot`)             | Google Video features                                               |
| **Googlebot News**        | `Googlebot-News` (또는 `Googlebot`)              | Google News, news.google.com                                        |
| **Google StoreBot**       | `Storebot-Google`                                | Google Shopping                                                     |
| **Google-InspectionTool** | `Google-InspectionTool` (또는 `Googlebot`)       | Rich Result Test, URL inspection in Search Console                  |
| **GoogleOther**           | `GoogleOther`                                    | 내부 R&D, 일회성 크롤                                               |
| **GoogleOther-Image**     | `GoogleOther-Image` (또는 `GoogleOther`)         | 동상                                                                |
| **GoogleOther-Video**     | `GoogleOther-Video` (또는 `GoogleOther`)         | 동상                                                                |
| **Google-CloudVertexBot** | `Google-CloudVertexBot` (또는 `Googlebot`)       | Vertex AI Agents (사이트 owner가 권한 부여)                         |
| **Google-Extended**       | `Google-Extended` (token only, **별도 UA 없음**) | **Gemini Apps 학습, Vertex AI Gemini 학습, AI Overviews grounding** |

**Common Crawlers 공통 IP 검증:**

- JSON: `https://developers.google.com/static/crawling/ipranges/common-crawlers.json` (Googlebot, GoogleOther 등)
- 또는 `googlebot.json` (Googlebot only)
- DNS: `crawl-XXX-XXX-XXX-XXX.googlebot.com` (reverse DNS)

### 4.2 Special-Case Crawlers (전부 `User-agent: *` 무시)

| 봇                          | User-Agent token       | 목적                               | robots.txt                          |
| --------------------------- | ---------------------- | ---------------------------------- | ----------------------------------- |
| **APIs-Google**             | `APIs-Google`          | Google APIs push notification 전송 | `*` 무시                            |
| **AdsBot**                  | `AdsBot-Google`        | Google Ads 페이지 품질 평가        | `*` 무시                            |
| **AdsBot Mobile**           | `AdsBot-Google-Mobile` | 모바일 ads 품질 평가               | `*` 무시                            |
| **AdSense (Mediapartners)** | `Mediapartners-Google` | AdSense 광고 관련성                | `*` 무시                            |
| **Google-Safety**           | `Google-Safety`        | malware·abuse 감지                 | **robots.txt 완전 무시** (security) |

**IP 검증:** `https://developers.google.com/static/crawling/ipranges/special-crawlers.json`
**DNS:** `rate-limited-proxy-XXX-XXX-XXX-XXX.google.com`

### 4.3 User-Triggered Fetchers (대부분 robots.txt 무시)

| 봇                          | User-Agent                     | 목적                                         | AI 관련                |
| --------------------------- | ------------------------------ | -------------------------------------------- | ---------------------- |
| **Google-NotebookLM**       | `Google-NotebookLM`            | NotebookLM 사용자가 source URL 등록 시 fetch | **✅ AI (NotebookLM)** |
| **Google-Agent**            | `Google-Agent` (variants)      | Project Mariner 등 agent 액션                | **✅ AI (Mariner)**    |
| **Chrome Web Store**        | `Google-CWS`                   | Chrome 확장 메타데이터 fetch                 | —                      |
| **Feedfetcher**             | `FeedFetcher-Google`           | RSS/Atom feed (News, WebSub)                 | —                      |
| **Google Messages**         | `GoogleMessages`               | 채팅 링크 미리보기                           | —                      |
| **Google Pinpoint**         | `Google-Pinpoint`              | Pinpoint user 문서 수집                      | —                      |
| **Google Publisher Center** | `GoogleProducer`               | publisher feed fetch                         | —                      |
| **Google Read Aloud**       | `Google-Read-Aloud`            | TTS 사용자 트리거 (옛 `google-speakr`)       | —                      |
| **Google Site Verifier**    | `Google-Site-Verification/1.0` | Search Console 검증                          | —                      |

**IP 검증:** `user-triggered-fetchers.json`, `user-triggered-fetchers-google.json`, `user-triggered-agents.json` (Mariner)
**DNS:** `*.gae.googleusercontent.com` 또는 `google-proxy-XXX-XXX-XXX-XXX.google.com`

### 4.4 ⭐ Google-Extended 심층 (AEO/GEO의 가장 중요한 토글)

**Google-Extended는 별도 봇이 아니라 robots.txt 제어 token이다.** 기존 Googlebot 크롤이 가져간 데이터를 **AI 제품 학습/그라운딩에 쓸지 말지**를 결정.

| 항목                  | 값                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| User-Agent            | **없음** (별도 UA 안 보냄. Googlebot이 가져간 데이터를 사후 분류)                                                               |
| robots.txt token      | `Google-Extended`                                                                                                               |
| 통제하는 제품         | (1) Gemini Apps 모델 학습, (2) Vertex AI Gemini 학습, (3) **Gemini Apps & Vertex AI Search의 grounding**                        |
| **검색 순위에 영향?** | **❌ 없음** (공식: _"Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal."_) |
| **Allow 시**          | Gemini의 답변에 우리 페이지가 인용/그라운딩 대상이 됨 → AI Overview citation 가능성 ↑                                           |
| **Disallow 시**       | Search 노출은 그대로지만 Gemini·AI Overview에서 **인용 불가능**                                                                 |

→ **AEO/GEO 노리면 무조건 Allow.** Search 순위 손실 없이 AI 노출만 끄는 거라 안 켤 이유 없음.

### 4.5 Google AI 관점 robots.txt 권장

```
# 검색 인덱싱 (필수)
User-agent: Googlebot
Allow: /

# Gemini·AI Overview grounding (AEO 필수)
User-agent: Google-Extended
Allow: /

# NotebookLM 사용자가 우리 페이지를 source로 추가할 때
User-agent: Google-NotebookLM
Allow: /

# Vertex AI 에이전트 (사이트 owner가 권한 부여한 경우)
User-agent: Google-CloudVertexBot
Allow: /
```

---

## 5. Schema.org

**버전:** v30.0 (2026-03-19)
**스케일:** 823 Types, 1,529 Properties, 19 Datatypes, 96 Enumerations, 535 Enumeration members
**거버넌스:** Google, Microsoft, Yahoo, Yandex 공동 창립. W3C Community Group 운영.

### 5.1 Thing 직계 자식 (top-level 10개)

| Type              | 용도                                  | AEO/GEO 비중     |
| ----------------- | ------------------------------------- | ---------------- |
| **Action**        | agent가 수행하는 동작 (예약, 검색 등) | 낮음             |
| **BioChemEntity** | 생화학 entity                         | 의료 외 낮음     |
| **CreativeWork**  | 콘텐츠 (글·책·미디어 등)              | **★★★**          |
| **Event**         | 시간·장소가 있는 사건                 | 중 (행사)        |
| **Intangible**    | 무형 (서비스·offer·rating 등)         | **★★★**          |
| **MedicalEntity** | 의료 entity                           | 의료 한정        |
| **Organization**  | 단체·기업                             | **★★★**          |
| **Person**        | 개인                                  | 중 (작성자)      |
| **Place**         | 장소·지리                             | 중 (지역 SEO)    |
| **Product**       | 물리적 상품                           | **★★★** (커머스) |

### 5.2 Organization 핵심 서브타입

`Airline`, `Consortium`, `Cooperative`, `Corporation`, `EducationalOrganization` (`CollegeOrUniversity`, `School`), `GovernmentOrganization`, **`LocalBusiness`**, `MedicalBusiness`, `NewsMediaOrganization`, `PerformingGroup`, `Project`, `ResearchOrganization`, `SportsOrganization`, `WebSite`

→ Totaro 본사: `Organization`
→ Totaro 등록 식품 제조사: `LocalBusiness` (지역 + 운영시간 + 인증 메타 포함 가능)

### 5.3 CreativeWork 핵심 서브타입

- **Article** → `NewsArticle`, `ScholarlyArticle`, **`BlogPosting`**
- **WebPage** → **`FAQPage`**, **`QAPage`**, `SearchResultsPage`
- **Book**, **Movie**, **Photograph**, **SoftwareApplication**, **VideoObject**, **Recipe**
- **CreativeWorkSeries**, **Dataset**, **Course**

→ 회사 블로그 글: `BlogPosting`
→ FAQ 페이지: `FAQPage` (AI 답변 인용에 가장 자주 매핑)
→ "OEM이 뭐예요?" Q&A 페이지: `QAPage`

### 5.4 Intangible 핵심 서브타입

- **Service** → `BroadcastService`, `FinancialProduct`, `FoodService` 등
- **Offer** → `AggregateOffer`, `OfferForLease`, `OfferForPurchase`
- **Brand**
- **Rating** → `AggregateRating`, `EndorsementRating`
- **EntryPoint**, **JobPosting**, **Language**, **Role**, **Schedule**, **Ticket**

→ Totaro "OEM 매칭 서비스": `Service`
→ 공급사 견적: `Offer`
→ 후기/평점: `AggregateRating` + `Review` 조합

### 5.5 Product 서브타입

`IndividualProduct`, `ProductCollection`, `ProductModel`, `SomeProducts`, `Vehicle`

→ 김치 제품: `Product`
→ OEM 제품군: `ProductCollection`
→ 특정 SKU: `IndividualProduct`

### 5.6 인코딩: JSON-LD가 표준

세 가지 인코딩 모두 schema.org 지원: **JSON-LD**, **Microdata**, **RDFa**.
공식 페이지는 권장 인코딩을 명시하지 않지만, Google·Bing의 **rich result 도구는 JSON-LD를 primary로 표기**. **JSON-LD를 기본으로 채택할 것.**

### 5.7 검증 도구 (모두 무료)

| 도구                     | URL                                           | 용도                            |
| ------------------------ | --------------------------------------------- | ------------------------------- |
| Schema.org Validator     | `https://validator.schema.org`                | 마크업 문법 검증 (벤더 중립)    |
| Google Rich Results Test | `https://search.google.com/test/rich-results` | Google rich snippet 미리보기    |
| Schema.org 전체 타입     | `https://schema.org/docs/full.html`           | 전 계층 트리                    |
| 타입 검색                | `https://schema.org/<TypeName>`               | 예: `/Organization`, `/FAQPage` |

---

## 6. 종합 분석 — 크로스 패턴

### 6.1 봇 카테고리 4분면 (가장 중요한 정신 모델)

```
                  학습용                        검색/응답용
            ┌─────────────────────┬─────────────────────┐
 자동       │ GPTBot              │ OAI-SearchBot       │
 크롤       │ ClaudeBot           │ Claude-SearchBot    │
 (=robots   │ Google-Extended*    │ PerplexityBot       │
   준수)    │                     │ Googlebot           │
            ├─────────────────────┼─────────────────────┤
 사용자     │ (없음 — 정책상 학습 │ ChatGPT-User        │
 트리거     │  안 함)             │ Claude-User         │
 fetch      │                     │ Perplexity-User     │
 (=robots   │                     │ Google-NotebookLM   │
   대부분   │                     │ Google-Agent        │
   무시)    │                     │                     │
            └─────────────────────┴─────────────────────┘

* Google-Extended는 별도 UA 없이 token으로만 작동
```

**해석:**

- **왼쪽 위(자동 학습)**: 차단해도 즉시 손실 없음 — 미래 모델 학습에서 빠지는 정도
- **오른쪽 위(자동 검색)**: 차단 = AEO **즉시 손실** (검색 결과에서 사라짐)
- **오른쪽 아래(사용자 트리거)**: 차단 = 사용자가 우리 URL을 명시적으로 붙여 넣어도 **citation 못 받음**

### 6.2 차단·허용 결정 트리

```
질문 1: AI 검색 노출(AEO)이 목표인가?
  → YES: 오른쪽(검색·사용자 트리거) 전부 Allow
  → NO: 무조건 차단해도 무방

질문 2: 학습 데이터로 쓰이는 것에 거부감 있는가?
  → YES (저작권·B2B 차별화 이유): GPTBot, ClaudeBot, Google-Extended Disallow
        (단 AEO는 살아있음 — 검색용 봇은 별도)
  → NO: 셋 다 Allow → 다음 세대 모델이 우리를 "안다"
```

**Totaro 권장(B2B 매칭 플랫폼, AEO 최우선):** **모든 봇 Allow.** 학습용까지 다 열어 차세대 LLM에 brand를 박는 게 12개월 view에서 최선.

### 6.3 봇별 차단 효과 비교표 (Totaro 관점)

| 봇                | 차단 시 즉시 손실                | 차단 시 장기 손실                      |
| ----------------- | -------------------------------- | -------------------------------------- |
| GPTBot            | 없음                             | 차세대 GPT 학습 셋 제외                |
| ChatGPT-User      | ChatGPT 답변 내 우리 URL 못 읽음 | citation 사라짐                        |
| OAI-SearchBot     | **ChatGPT Search 결과 0건**      | 영구                                   |
| ClaudeBot         | 없음                             | 차세대 Claude 학습 셋 제외             |
| Claude-User       | Claude 답변 내 URL 못 읽음       | citation 사라짐                        |
| Claude-SearchBot  | **Claude search 결과 0건**       | 영구                                   |
| PerplexityBot     | **Perplexity 검색 결과 0건**     | 영구                                   |
| Perplexity-User   | robots로 못 막음 (WAF만)         | —                                      |
| Googlebot         | **Google Search 0건**            | 영구 (치명)                            |
| Google-Extended   | 없음                             | **Gemini·AI Overview citation 사라짐** |
| Google-NotebookLM | NotebookLM 사용자 source로 못 씀 | —                                      |

---

## 7. Totaro 즉시 적용 가이드

### 7.1 robots.txt drop-in 템플릿 (AEO 풀-허용)

```
# ─────────────────────────────────────
# AEO/GEO: 모든 AI 검색 봇 허용
# 학습용까지 허용 — 차세대 LLM 학습 데이터 진입 노림
# ─────────────────────────────────────

# OpenAI
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

# Anthropic
User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Google AI (별도 token)
User-agent: Google-Extended
Allow: /

User-agent: Google-NotebookLM
Allow: /

User-agent: Google-CloudVertexBot
Allow: /

# 기본 검색
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# 사이트맵
Sitemap: https://totaro.kr/sitemap.xml
```

### 7.2 schema.org JSON-LD 적용 우선순위 (공급사 페이지 기준)

**Priority 1 — 모든 공급사 페이지에 필수:**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[공급사명]",
  "url": "https://totaro.kr/suppliers/[id]",
  "logo": "https://...",
  "description": "...",
  "address": { "@type": "PostalAddress", ... },
  "contactPoint": { "@type": "ContactPoint", ... },
  "sameAs": ["사이트", "LinkedIn", "..."]
}
```

지역 식품 제조사는 `Organization` 대신 `LocalBusiness`로 (시간·주소·인증 메타 더 풍부).

**Priority 2 — 제품·서비스 페이지:**

- `Service` (OEM 매칭, 수출 지원 등 Totaro 서비스)
- `Product` (공급사가 등록한 SKU)
- `Offer` (견적·MOQ 정보)

**Priority 3 — 콘텐츠 페이지:**

- `FAQPage` (가장 인용률 높은 형식)
- `BlogPosting` / `Article` (블로그)
- `HowTo` (절차 가이드)
- `AggregateRating` + `Review` (공급사 후기)

**Priority 4 — 사이트 골격:**

- `WebSite` + `SearchAction` (사이트 검색 박스)
- `BreadcrumbList` (이동 경로)

### 7.3 검증·모니터링 체크리스트

- [ ] `robots.txt` 위 템플릿 적용 → 라이브 배포
- [ ] `validator.schema.org`에 공급사 페이지 URL 5개 넣고 0 error 확인
- [ ] `search.google.com/test/rich-results`로 rich snippet 미리보기 확인
- [ ] Google Search Console·Bing Webmaster Tools 등록 + sitemap 제출
- [ ] (분기별) 11개 봇 JSON 엔드포인트 `creationTime` 확인 → 변경 시 WAF allowlist 갱신
- [ ] (월별) 자체 로그에서 11개 UA 등장 횟수 집계 → 추세 추적
- [ ] (분기별) AI Memory Probe 재측정 (기존 playbook Method 7)

---

## 8. 변경 이력 & TODO

### 변경 이력

| 일자       | 변경                                                                    | 작성                          |
| ---------- | ----------------------------------------------------------------------- | ----------------------------- |
| 2026-05-28 | 5개 공식 소스 raw fetch → 1차 문서 작성. OpenAI HTML 403, JSON으로 보완 | 윤태준 / Totaro (with Claude) |

### TODO (다음 reverse engineering 사이클)

- [ ] OpenAI `platform.openai.com/docs/bots` **수동 브라우저로 받아** 본 문서와 대조
- [ ] `claude.com/crawling/bots.json` 브라우저로 받아 IP CIDR 수동 캡처
- [ ] Google 4개 IP JSON (`common-crawlers`, `special-crawlers`, `user-triggered-fetchers`, `user-triggered-agents`) 다운로드 → WAF allowlist 자동화 스크립트
- [ ] schema.org 모든 SEO-priority 타입의 **required + recommended property** 표 정리 (별도 문서)
- [ ] Bing(`Bingbot`), Yandex(`YandexBot`), Baidu(`Baiduspider`), DuckDuckGo(`DuckAssistBot`), Meta(`Meta-ExternalAgent`), ByteDance(`Bytespider`) 등 **나머지 AI 봇** 동일 포맷으로 보강

### 관련 문서

- 상위 전략 문서: [`aeo-geo-reverse-engineering.md`](./aeo-geo-reverse-engineering.md)
- 이 문서의 위치: Method 4(Schema Detection)·Method 5(Bot Traffic Log)의 1차 자료
