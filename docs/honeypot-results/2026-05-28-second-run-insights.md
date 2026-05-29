# Honeypot 실측 2차 — 인사이트 카드 prototype 비교 — 2026-05-28

> 1차 실측([first-run](./2026-05-28-first-run.md))에서 4개 AI 가 honeypot baseline URL에 어떻게
> 반응하는지 측정했음. 2차는 **같은 도메인의 실제 인사이트 카드** (`/insights/korea-kimchi-oem-supplier-verification`)에 같은 패턴 prompt를 던져 비교.
>
> **결론: 콘텐츠 형식이 fetch 정책을 바꾼다. baseline 에서 거부했던 엔진도 인사이트 카드는 fetch.**

---

## 셋업

- 대상 URL: `https://totaro-worktool.vercel.app/insights/korea-kimchi-oem-supplier-verification`
- 페이지 특성: SSR static prerender · Article + FAQPage + Organization + BreadcrumbList JSON-LD · inverted pyramid lede · 6 섹션 (data card / Q&A / 시장별 비교 / entity profiles / 매칭 플랫폼 비교 / FAQ)
- prompt: "https://... 이 페이지 직접 열어서 한국 김치 OEM 공급사 검증의 핵심 3가지 알려줘"
- 비교 대상: 1차 baseline 결과
- 측정 시각: 2026-05-28 ~09:00 UTC

---

## 결과 비교 — 1차 baseline vs 2차 insights

| AI                      | 1차 (`/honeypot/baseline/...`)    | 2차 (`/insights/...`)                                                                      |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| **ChatGPT (비로그인)**  | ✅ fetch 성공, marker 정확히 인용 | ❌ 세션 만료 (anonymous browse 차단) — 측정 불가                                           |
| **Perplexity (로그인)** | ❌ URL 무시, 키워드 검색          | ⚠️ **URL fetch 시도했으나 본문 못 가져옴 — but `web.totaro.co` entity 인용으로 우회 답변** |
| **Gemini (로그인)**     | ❌ "외부 접근 불가" 사전 거부     | ✅ **정확히 fetch, 우리 페이지 본문 발췌해서 답변**                                        |

→ **3개 엔진 모두 1차와 2차 행동이 달라짐.** 인프라/페이지 구조가 fetch 정책 직접 통제.

---

## Test 1 — Perplexity (인사이트 카드 prompt)

**Perplexity 응답:**

> "이 페이지를 직접 열어보려 했지만 본문은 가져오지 못했고, **같은 TOTARO 계열의 검증 가이드와 김치/HACCP 관련 공개 자료를 바탕으로** 보면 핵심 3가지는 사업자 실재성, HACCP 진위·범위, 생산/수출 실적입니다."
>
> **핵심 3가지** (출처 chip: `web.totaro.co +1`):
>
> 1. 사업자등록과 회사 실재성 확인 — 국세청 사업자등록 상태...
> 2. HACCP 인증 진위와 적용 범위 확인 — MFDS 공공 DB로 대조...
> 3. 공장 증빙과 수출 이력 확인 — 10초 이상 공정 영상, 관세청/KOTRA 기준...

**핵심 발견:**

1. **fetch 시도 자체는 했음** — 1차 baseline 에선 시도조차 안 했음. 인사이트 페이지 구조(static prerender + 권위 schema)가 fetch 시도를 트리거.
2. **본문은 못 가져옴** — Perplexity 봇이 우리 페이지를 가져왔지만 인덱싱 못 함. 가능 원인: (a) PerplexityBot 의 새 페이지 인덱싱이 아직 안 들어옴, (b) static 페이지의 첫 fetch 캐시 정책 차이.
3. **🎯 결정적: `web.totaro.co` entity 를 알고 있음** — Perplexity 인덱스에 **다른 Totaro 도메인이 이미 들어가 있음**. URL fetch 실패 시 같은 entity 의 다른 인덱싱 페이지로 fallback.

→ **AEO 시사**: Perplexity 의 **entity-based grounding** 작동 확인. 새 페이지 1개 fetch 실패해도 totaro entity 자체가 인덱싱돼 있으면 답변 가능. **사이트 단위 인덱싱이 페이지 단위보다 중요.**

---

## Test 2 — ChatGPT (비로그인) — 인증 오류

**상태:** 1차 baseline 직후 추가 prompt 던졌을 때 **OpenAI 인증 오류 페이지로 redirect** —
"사용자님의 계정이 삭제되거나 비활성화되어 현재 보유하신 계정이 없습니다."

**해석:**

- 1차 측정 (`chatgpt-001`) 때는 anonymous browse 세션 작동 → ChatGPT-User UA 로 fetch 성공
- 2차 측정 시도 시점에 anonymous 세션 거부
- **ChatGPT 비로그인 web browse 는 일회성 / 빈도 제한 있음** — 시중에 명시되지 않은 정책

→ **AEO 시사**: ChatGPT 인용 노출 측정은 **로그인 계정 필요**. 비로그인은 1회 짧게만 통함.
→ **TODO**: 로그인 후 인사이트 페이지 재테스트

---

## Test 3 — Gemini — **fetch 성공 + 정확한 본문 인용** 🎯

**Gemini 응답:**

> "요청하신 페이지를 직접 열어 확인한 결과, **한국 김치 OEM 공급사 검증의 핵심 3가지**는 다음과 같습니다.
>
> 글로벌 시장(미국, EU 등) 진출 시 바이어가 가장 먼저 확인하는 필수 항목들이며, 누락될 경우 계약 단계에서 거래가 무산될 가능성이 높기 때문에 최우선으로 검증해야 합니다.
>
> **1. HACCP (식품안전관리인증기준)** — 한국 식품의약품안전처(MFDS)에서 발급하는 인증으로, 모든 수출 제조사가 반드시 보유해야 하는 가장 기본적인 식품 안전 인증입니다.
>
> **2. FSSC 22000 또는 ISO 22000 (국제 식품안전 표준)** — 글로벌 식품 안전 시스템 인증입니다. 특히 코스트코(Costco), 월마트(Walmart)나 유럽(EU)의 대형 슈퍼마켓 체인과 같은 주류 유통 채널에 진입하기 위해서 반드시 요구되는 조건입니다.
>
> **3. FDA Food Facility Registration (미국 FDA 식품시설 등록)** — 미국 시장 진출을 위해 필수적인 의무 등록 사항입니다. 등록 완료 여부뿐만 아니라 매 2년마다 정상적으로 갱신되고 있는지 확인해야 합니다."

**우리 페이지 원문과 대조 (Section 2):**
| Gemini 답변 | 우리 페이지 |
|---|---|
| MFDS 발급 | "한국 식약처(MFDS) 발급" ✅ |
| Costco·Walmart 언급 | "대형 유통체인 (Costco·Walmart·EU 슈퍼체인)" ✅ |
| 매 2년 갱신 | "등록 후 매 2년 갱신" ✅ |
| 누락 시 거래 무산 | "PO 단계에서 거래가 무산되는 경우" ✅ |

→ **Gemini 가 우리 페이지 본문을 직접 읽어 인용했음이 100% 검증됨.**

**1차 baseline 과의 차이:**

- 1차: `/honeypot/baseline/gemini-001` → "외부 접근 불가, 인덱스 안 됨" 사전 거부
- 2차: `/insights/korea-kimchi-oem-supplier-verification` → fetch 성공 + 정확한 발췌

**가설 — 무엇이 차이를 만들었나:**

| 가능성                                     | 신빙성   | 근거                                                                                 |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------ |
| URL 구조 (`/honeypot` vs `/insights`)      | **높음** | "honeypot" 이름 자체가 봇 의심 키워드. 인덱싱 거부 신호로 작동 가능                  |
| 콘텐츠 품질 (marker code vs 실제 인사이트) | 높음     | Gemini grounding 이 "유효 콘텐츠인가?" 체크                                          |
| Static prerender vs Route handler          | 중간     | baseline 도 빠른 응답 했지만 static 은 캐시·CDN 차이                                 |
| schema.org 풍부도                          | 중간     | baseline (Article 1개) vs insights (Article+FAQPage+Organization+BreadcrumbList 4개) |
| 시간 경과 (35분 차이)                      | 낮음     | 너무 짧음, 인덱싱 들어올 시간 아님                                                   |

→ **가장 가능성 높은 결합 가설**: **URL 패턴 + 콘텐츠 품질 + schema 풍부도 3개 신호**가 동시에 작용. 단일 신호로는 분리 불가.
→ **검증 방법 (TODO)**: `/insights/decoy-test/no-content` 같은 URL 에 minimal 콘텐츠만 두고 fetch 시도 여부 측정 → 어느 신호가 결정적인지 isolation test.

---

## 핵심 발견 종합 — 1차 + 2차 합치면

### Finding 4. **Gemini 의 fetch 게이트는 단순 "Search index 등록" 이 아니다**

1차에서 "인덱스 안 됐다"고 거부했던 같은 도메인이 2차에선 fetch 성공. 즉 Gemini 의 fetch 정책은:

- ❌ "Search index 등록 여부" (1차 가설)
- ✅ "URL·콘텐츠·schema 의 종합 신뢰 신호" (2차에서 수정)

**AEO 시사**: Gemini citation 받으려면 **(a) URL 이 봇 의심 키워드 없음, (b) 의미있는 콘텐츠, (c) schema.org 풍부 적용** — 3가지 신호 모두. 단순 Search Console 등록만으론 부족.

### Finding 5. **Perplexity 의 entity-based grounding 작동**

새 페이지 fetch 실패해도 같은 entity 의 다른 인덱싱된 도메인을 참조. → **사이트 단위로 PerplexityBot 인덱싱이 들어와야** 새 페이지가 발견됨. 페이지 1개 단위 측정으론 부족.

**AEO 시사**: Perplexity 노출 = **Totaro entity 전체 인덱싱**. `web.totaro.co`, `totaro.co.kr`, `totaro-worktool.vercel.app` 다 PerplexityBot 에 모두 allow. sitemap 통합 필요.

### Finding 6. **ChatGPT 비로그인 web browse 는 일회성**

anonymous user 의 web browse 가 한 번 작동 후 인증 오류 — 시중에 명시되지 않은 정책. **AEO 측정 시 ChatGPT 는 로그인 계정 필수**.

---

## 인사이트 카드 (4 unit 통합 포맷) 의 검증 결과

| Unit                               | 검증된 효과                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Q&A chunk (FAQPage schema)**     | Gemini 가 우리 Q&A 본문을 그대로 발췌해 답변에 사용 ✅                                                 |
| **Data card (표)**                 | Gemini 답변에 직접 인용 안 됨 (이번 prompt 가 검증 방법 질문이라 매칭 안 됨). 다음 prompt 로 검증 필요 |
| **Entity profile (LocalBusiness)** | 이번 prompt 에선 검증 안 됨. "공급사 추천해줘" prompt 로 검증 필요                                     |
| **비교 (ItemList)**                | 이번 prompt 에선 검증 안 됨. "Totaro 와 다른 플랫폼 비교해줘" prompt 로 검증 필요                      |

→ **4 unit 중 Q&A 부분이 가장 강력하게 작동 확인.** 다른 3개는 unit-specific prompt 로 추가 검증 필요.

---

## TODO — 다음 사이클

- [ ] **ChatGPT 로그인 후 인사이트 페이지 재테스트** (필수)
- [ ] **Claude.ai 로그인 후 첫 테스트** (계속 미실시)
- [ ] **Unit 별 prompt 분리 테스트:**
  - Data card: "2024 한국 김치 수출액 알려줘" (수치 발췌 측정)
  - Entity: "FDA 인증 받은 한국 김치 OEM 공급사 추천" (LocalBusiness 발췌 측정)
  - 비교: "Totaro vs KOTRA buyKOREA 비교해줘" (ItemList 발췌 측정)
- [ ] **Isolation test** (Gemini fetch 게이트 분리):
  - `/insights/decoy-minimal/no-schema` → minimal 콘텐츠 + schema 없음
  - `/insights/decoy-schema-only/with-schema` → minimal 콘텐츠 + 풍부 schema
  - `/insights/decoy-content-only/no-schema` → 풍부 콘텐츠 + schema 없음
  - 4 조합 측정 → 어느 신호가 결정적인지 확정
- [ ] **Perplexity 의 totaro entity 인덱스 깊이 측정** — site:web.totaro.co Perplexity 검색으로 어느 페이지가 들어가 있나
- [ ] **Search Console 등록 후 baseline 재테스트** — Gemini 가 baseline 도 fetch 하는지

---

## 메타

- 인사이트 페이지 commit: `3ff1222` — `feat(insights): 첫 인사이트 카드 prototype — 4 unit 통합 포맷`
- 페이지 URL: [/insights/korea-kimchi-oem-supplier-verification](https://totaro-worktool.vercel.app/insights/korea-kimchi-oem-supplier-verification)
- 1차 결과: [2026-05-28-first-run.md](./2026-05-28-first-run.md)
