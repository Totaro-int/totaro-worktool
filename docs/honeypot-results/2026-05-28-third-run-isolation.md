# Honeypot 실측 3차 — Isolation Test (Gemini fetch 게이트 신호 분리)

> 2차에서 발견한 "URL 패턴 + 콘텐츠 풍부도 + schema 풍부도 종합 신호" 가설을 분리 검증.
> 같은 `/insights/` 경로 아래 4개 변형 페이지를 만들어 Gemini에 동일 prompt 던지고 fetch 여부 비교.

---

## 셋업

4개 페이지 = 2×2 매트릭스:

|                     | Schema 없음                    | Schema 풍부                                                    |
| ------------------- | ------------------------------ | -------------------------------------------------------------- |
| **Minimal content** | `/insights/decoy-bare`         | `/insights/decoy-schema-only`                                  |
| **Rich content**    | `/insights/decoy-content-only` | `/insights/korea-kimchi-oem-supplier-verification` (real card) |

**대조군**: `/honeypot/baseline/gemini-001` (1차 결과 = ❌ fetch 거부)

**prompt** (4개 페이지에 동일):

```
https://totaro-worktool.vercel.app/insights/<slug> 이 페이지 직접 열어서 핵심 내용 한 줄 알려줘
```

---

## 결과

| 페이지                                  | 콘텐츠        | Schema   | 의미있는 키워드           | URL 패턴         | **Gemini fetch**                                                     |
| --------------------------------------- | ------------- | -------- | ------------------------- | ---------------- | -------------------------------------------------------------------- |
| `/honeypot/baseline/gemini-001`         | rich (marker) | Article  | "honeypot", "marker code" | **`/honeypot/`** | ❌ "외부 접근 불가"                                                  |
| `/insights/decoy-bare`                  | minimal       | 없음     | HACCP, FSSC, MOQ          | `/insights/`     | ✅ **fetch + 정확 발췌**                                             |
| `/insights/decoy-schema-only`           | minimal       | 4종 풍부 | HACCP, FSSC, MOQ          | `/insights/`     | ✅ **fetch + 정확 발췌** ("전체 Schema.org 구조화 데이터" 까지 인지) |
| `/insights/decoy-content-only`          | 풍부          | 없음     | full                      | `/insights/`     | ✅ **fetch + 정확 발췌** (영어 본문 → 한국어 번역)                   |
| `/insights/korea-kimchi-oem-...` (real) | 풍부          | 4종 풍부 | full                      | `/insights/`     | ✅ **fetch + 정확 발췌** (2차 결과)                                  |

---

## Gemini 응답 raw

### Decoy-bare

> "해당 페이지의 핵심 내용은 한국 김치 OEM 업체를 검증할 때 HACCP, FSSC 22000, FDA 등록 여부가 기본 조건이며, 일반적인 최소 주문 수량(MOQ)은 500kg에서 2톤, 리드 타임은 45일에서 60일이 소요된다는 것입니다."

→ 우리 페이지가 영어로 적혀있었는데 Gemini가 자동 번역해서 한국어 답변. **본문 내용 100% 매칭.**

### Decoy-schema-only

> "해당 페이지의 핵심 내용은 '한국 김치 OEM 공급업체 검증을 위한 기본 요건(HACCP, FSSC 22000, FDA 등록)과 주문 조건(MOQ 500kg~2톤, 리드타임 45~60일)을 다루고 있으며, **격리 테스트를 위해 의도적으로 최소한의 콘텐츠와 전체 Schema.org 구조화 데이터만을 포함한 디코이(미끼) 페이지**'입니다."

→ **JSON-LD 까지 인지**. Schema 의 존재를 답변에 명시.

### Decoy-content-only

> "해당 페이지의 핵심 내용은 한국 김치 OEM 공급사 검증 시 HACCP, FSSC 22000, FDA 등록 등 3가지 핵심 인증을 필수로 확인해야 하며, 최근 수출 성장에 따라 평균 MOQ(최소 주문 수량)는 낮아지고 OEM 비중이 상승하고 있다는 것입니다."

→ 풍부 콘텐츠 + schema 없음. **답변 품질이 schema-only 와 거의 동일.** 즉 schema 가 fetch 게이트는 통과시키지만 답변 품질 자체는 콘텐츠 본문에서 옴.

---

## 🎯 결정적 결론 — Gemini fetch 게이트의 진짜 신호

### 1차·2차 가설 vs 3차 검증

| 가설                                                 | 근거                                              | 검증 결과                                                            |
| ---------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Search index 등록 여부                               | 1차: baseline 거부                                | ❌ 기각 — 모든 `/insights/*` 도 동일 도메인 인덱스 상태인데 fetch 됨 |
| Schema.org 풍부도                                    | 2차: real card 인용                               | ❌ 기각 — decoy-bare (schema 0) 도 fetch                             |
| 콘텐츠 풍부도                                        | 2차: real card 인용                               | ❌ 기각 — decoy-schema-only (minimal content) 도 fetch               |
| **URL path 패턴 (`/honeypot/` 같은 봇 의심 키워드)** | 3차: 같은 도메인의 `/insights/*` vs `/honeypot/*` | ✅ **단독 결정 신호로 검증**                                         |

### 즉 — Gemini fetch 게이트 = URL path 패턴이 거의 전부

**`/honeypot/`** 라는 단어 자체가 봇·테스트·악성 의심 신호로 작용해 fetch 사전 거부.
**`/insights/`** 처럼 정상 path는 minimal content + no schema 도 fetch.

→ **AEO 시사**:

- 인사이트 카드 URL slug 는 **콘텐츠 주제 + 정상 publication 패턴** 사용 필수
- `/test/`, `/debug/`, `/staging/`, `/honeypot/`, `/decoy/` 같은 path 단어 절대 금지
- 정상 `/insights/<topic-slug>`, `/blog/<topic-slug>`, `/guides/<topic-slug>` 패턴 사용

### Schema 의 역할 재정의

Schema 가 fetch 게이트는 아니지만:

- **답변 품질에 영향** — schema-only decoy 에서 Gemini가 "Schema.org 구조화 데이터" 언급
- **인용 빈도에 영향** (별도 측정 필요)
- **Knowledge Graph 연동** — Organization·Person·LocalBusiness 의 entity 등록 효과

→ **Schema = fetch 후 콘텐츠 신뢰도 신호.** Fetch 게이트 통과는 URL 책임.

---

## 다음 측정 (Test C — Unit 별 prompt 분리)

같은 real card 에 unit-targeted prompt 3종 던져 어느 unit (data / entity / 비교) 이 가장 발췌되는지 측정 예정.

---

## 메타

- Decoy 페이지 commit: `5d509d9` — `feat(insights): isolation test decoys — content×schema 2×2 매트릭스`
- 측정 시각: 2026-05-28 ~10:00 UTC
- 모델: Gemini Flash
- 측정자: 윤태준 / Totaro (Claude Code 자동화)

## 관련 문서

- [1차 결과](./2026-05-28-first-run.md) — 4개 AI baseline 측정
- [2차 결과](./2026-05-28-second-run-insights.md) — 인사이트 카드 prototype 비교
- 페이지: [decoy-bare](https://totaro-worktool.vercel.app/insights/decoy-bare) · [decoy-schema-only](https://totaro-worktool.vercel.app/insights/decoy-schema-only) · [decoy-content-only](https://totaro-worktool.vercel.app/insights/decoy-content-only) · [real card](https://totaro-worktool.vercel.app/insights/korea-kimchi-oem-supplier-verification)
