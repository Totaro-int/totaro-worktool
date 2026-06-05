# Method 1 — Citation Source Mapping (Totaro)

> 회사: **Totaro** (식품 OEM 공급사 ↔ 해외 바이어 매칭 · 김치/라면/만두/소스)
> 목적: 타겟 쿼리에 대해 5개 AI 엔진이 **어떤 출처(URL·도메인)를 인용하는지** 매핑 → "AI가 신뢰하는 출처" baseline.
> 플랜 출처: `docs/aeo-geo-reverse-engineering.md` Method 1 / Section 9 Day 1.

## Day 1 — 타겟 쿼리 20개 (영어 10 + 한국어 10)

바이어 여정: **발견(discovery) → 제품별 → 인증 → MOQ/소량 → 검증** 을 고루 커버.

### 영어 (해외 바이어 — 수입상·브랜드·유통사)

| #   | Query                                                        | 의도                |
| --- | ------------------------------------------------------------ | ------------------- |
| E1  | `Korean food OEM manufacturer with export support`           | 일반 OEM + 수출지원 |
| E2  | `find Korean kimchi private label producer`                  | 제품: 김치 · PL     |
| E3  | `Korea contract food manufacturer FDA certified`             | 인증: FDA           |
| E4  | `Korean instant ramen OEM supplier low MOQ`                  | 제품: 라면 · MOQ    |
| E5  | `private label frozen dumplings mandu manufacturer Korea`    | 제품: 만두 · PL     |
| E6  | `how to find a reliable Korean food supplier for import`     | 발견/신뢰           |
| E7  | `Korean K-food OEM HACCP certified for US market`            | 인증 + 시장         |
| E8  | `gochujang Korean sauce private label manufacturer`          | 제품: 소스 · PL     |
| E9  | `small batch Korean food contract manufacturer for startups` | MOQ/스타트업        |
| E10 | `how to verify a Korean food manufacturer before ordering`   | 검증                |

### 한국어 (무역상·바이어 대행·국내 수출기업)

| #   | Query                                   | 의도                |
| --- | --------------------------------------- | ------------------- |
| K1  | `한국 김치 OEM 수출 가능한 곳`          | 제품: 김치 · 수출   |
| K2  | `해외 수출용 식품 OEM 제조사 찾는 법`   | 일반 OEM · 수출     |
| K3  | `라면 OEM 소량 생산 공장`               | 제품: 라면 · MOQ    |
| K4  | `만두 냉동식품 OEM private label 한국`  | 제품: 만두 · PL     |
| K5  | `HACCP 인증 한국 식품 제조사 수출`      | 인증: HACCP         |
| K6  | `K-푸드 OEM 해외 바이어 매칭 플랫폼`    | 플랫폼/매칭         |
| K7  | `고추장 소스 OEM 자체 브랜드 제작 한국` | 제품: 소스 · 브랜드 |
| K8  | `식품 OEM MOQ 낮은 제조사 추천`         | MOQ                 |
| K9  | `한국 식품 수출 OEM 공장 검증하는 법`   | 검증                |
| K10 | `FDA 등록 한국 식품 OEM 제조사`         | 인증: FDA           |

---

## Day 2~3 — 측정 매트릭스 (200 runs: 20 쿼리 × 5 엔진 × 2 언어는 위 20개에 이미 언어 포함)

각 쿼리를 **5개 엔진**에 입력 → 인용된 URL/도메인 기록. 인용 없으면 `-`.

> 엔진: **ChatGPT(Browse)** · **Perplexity** · **Claude** · **Gemini** · **Google AI Overviews**

| 쿼리 | ChatGPT | Perplexity | Claude | Gemini | Google AIO | totaro.kr 인용? |
| ---- | ------- | ---------- | ------ | ------ | ---------- | --------------- |
| E1   |         |            |        |        |            | ☐               |
| E2   |         |            |        |        |            | ☐               |
| E3   |         |            |        |        |            | ☐               |
| E4   |         |            |        |        |            | ☐               |
| E5   |         |            |        |        |            | ☐               |
| E6   |         |            |        |        |            | ☐               |
| E7   |         |            |        |        |            | ☐               |
| E8   |         |            |        |        |            | ☐               |
| E9   |         |            |        |        |            | ☐               |
| E10  |         |            |        |        |            | ☐               |
| K1   |         |            |        |        |            | ☐               |
| K2   |         |            |        |        |            | ☐               |
| K3   |         |            |        |        |            | ☐               |
| K4   |         |            |        |        |            | ☐               |
| K5   |         |            |        |        |            | ☐               |
| K6   |         |            |        |        |            | ☐               |
| K7   |         |            |        |        |            | ☐               |
| K8   |         |            |        |        |            | ☐               |
| K9   |         |            |        |        |            | ☐               |
| K10  |         |            |        |        |            | ☐               |

### 기록 규칙

- 각 칸에 **인용된 도메인** 적기 (예: `tridge.com`, `alibaba.com`, `reddit.com`). 여러 개면 쉼표.
- 인용 자체가 없으면 `-`.
- 맨 오른쪽 = 어떤 엔진에서든 **totaro.kr** 가 인용됐는지 (현재 baseline = 거의 ☐ 예상).

### 결과물 (Day 4 분석용)

- **Citation Frequency Sheet**: 도메인별 인용 횟수 ranking → "AI가 신뢰하는 출처" top 도메인.
- 우리 목표: 그 top 도메인들의 **콘텐츠 포맷·스키마**를 Method 3/4로 분석 → totaro.kr 가 거기 끼려면 뭘 갖춰야 하는지.

---

## 측정 결과 — 검색 프록시 (2026-06-01)

> 방법: 20개 쿼리를 Google 검색(= AI Overviews 인용 출처 근사)에 입력 → 상위 도메인 기록.
> ⚠️ 4개 AI 엔진(ChatGPT·Perplexity·Claude·Gemini) 직접 측정은 미완 (브라우저 반자동 필요).

### 쿼리별 상위 도메인 + Totaro 인용 여부

| 쿼리                | 상위 도메인                                    | totaro? |
| ------------------- | ---------------------------------------------- | ------- |
| E1 OEM+수출         | ec21, tradekorea, accio                        | ✗       |
| E2 김치 PL          | keychain, usetorg, jongga                      | ✗       |
| E3 FDA              | mfds, accio, usda                              | ✗       |
| E4 라면 MOQ         | accio(x3), alibaba(x4), esgrid                 | ✗       |
| E5 만두 PL          | koreabeyonddmz, bibigo, foodmanufacturing      | ✗       |
| E6 공급사 찾기      | usetorg, gourmetpro(x2), koreaimporthub        | ✗       |
| **E7 HACCP+US**     | **web.totaro.co.kr (1·4위)**, tridge, foodware | ✅      |
| E8 고추장 PL        | lkk, kroger(x3), copackconnect                 | ✗       |
| E9 소량 스타트업    | seoulz, gourmetpro, beststartup                | ✗       |
| **E10 제조사 검증** | alibaba, **web.totaro.co.kr (2위)**, mfds      | ✅      |
| K1 김치 수출        | kati.net, hankyung, daesang                    | ✗       |
| K2 수출 OEM 찾기    | impfood.mfds, factory-platform, foodpolis      | ✗       |
| K3 라면 소량        | qoem, ifactoryhub, foodpolis                   | ✗       |
| K4 만두 OEM         | foodware, factory-platform, mfds               | ✗       |
| K5 HACCP 수출       | haccp.or.kr, foodsafetykorea, mfds             | ✗       |
| K6 바이어 매칭      | tradekorea(x3), qoem(x3), factory-platform     | ✗       |
| K7 고추장 OEM       | sodamkorea, seohaefoods, saucelab              | ✗       |
| K8 MOQ 낮은         | qoem, sinbibio, factory-platform               | ✗       |
| K9 공장 검증        | impfood.mfds, khidi, foodnews                  | ✗       |
| K10 FDA 등록        | qoem, mfds, foodpolis                          | ✗       |

### 도메인 인용 빈도 랭킹 (몇 개 쿼리에 등장)

| 순위  | 도메인                                          | 쿼리 수 | 유형                      |
| ----- | ----------------------------------------------- | ------- | ------------------------- |
| 1     | mfds.go.kr / impfood.mfds                       | ~7      | 정부 (KR + 인증)          |
| 2     | factory-platform.com                            | 5       | KR 제조사 매칭            |
| 3     | accio.com                                       | 4       | EN B2B 애그리게이터       |
| 3     | qoem.co.kr                                      | 4       | KR 소량 OEM               |
| 3     | foodpolis.kr (푸드이음)                         | 4       | KR 매칭                   |
| 6     | usetorg / foodware / usda / sinbibio            | 3       | 디렉토리·제조사·정부      |
| **7** | **web.totaro.co.kr**                            | **2**   | **EN 인증/검증 인사이트** |
| 7     | gourmetpro / kathrynread / alibaba / tradekorea | 2       | 가이드·커머스·무역        |

### 핵심 발견

1. **Totaro = 20개 중 2개 인용 (E7·E10)** — 둘 다 **영어 "인증/검증" 쿼리**, `web.totaro.co.kr/en/insights/` 콘텐츠로. → **인사이트(Authority Building) 콘텐츠 전략이 실제로 AI 인용을 만든다** (검증됨).
2. **공간이 둘로 갈림**: 영어 = 애그리게이터(accio·usetorg) + 가이드 콘텐츠(gourmetpro·kathrynread) + 美 정부(usda). 한국어 = KR 정부(mfds·haccp.or.kr) + 매칭 플랫폼(factory-platform·foodpolis·qoem).
3. **Totaro 사각지대**: 한국어 쿼리 10개 전부 0, 제품별·디렉토리 쿼리 전부 0.

### 전략 implications

- ✅ **되는 것 확장**: 영어 "인증·검증·가이드" 인사이트 콘텐츠 더 (E7·E10이 증명). gourmetpro·kathrynread식 "고르는 법" 가이드가 인용됨 → 우리 플레이북과 일치.
- ⛏️ **사각지대 공략**: 한국어 인사이트 콘텐츠(현재 0), 제품별("김치 OEM 고르는 법" 등) 가이드.
- 🏰 **디렉토리 쿼리**(accio·usetorg 독식)는 공급사 DB 규모가 필요 → 콘텐츠보다 플랫폼 자산.

## 상태

- [x] **Day 1: 타겟 쿼리 20개 정의**
- [x] **Day 2~3: 검색 프록시 측정 (Google 출처 근사) — 20/20**
- [ ] Day 2~3 (확장): 실제 4개 AI 엔진(ChatGPT·Perplexity·Claude·Gemini) 직접 측정 — 브라우저 반자동
- [ ] Day 4: top 30 URL 포맷/스키마 분석 (accio·gourmetpro·usetorg가 뭘 갖췄나)
