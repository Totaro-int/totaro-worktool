/**
 * 모네하우스(MONÉ HOUSE) 브랜드 SSOT — 모든 콘텐츠 생성의 단일 기준.
 *
 * 출처(정전) = 모네하우스 브랜드북 v2 (2026) → deploy/hermes/kim-sahyun.md PART 1(브랜드 절대 법칙).
 * 카드뉴스·캡션·이미지·챗 등 모든 생성기는 반드시 BRAND_GUIDE 를 프롬프트에 주입한다.
 * 각 파일이 요약본을 따로 들고 있지 말 것 — 브랜드가 바뀌면 이 한 곳만 고치고 라이브를 맞춘다.
 */

/** 모든 텍스트 생성(카드뉴스·캡션·분석·챗)에 주입하는 브랜드 법칙. */
export const BRAND_GUIDE = `=== 모네하우스(MONÉ HOUSE) 브랜드 법칙 — 모든 산출물은 무조건 이걸 따른다 (출처: 브랜드북 v2) ===
[본질] "A house, not a store." 스토어가 아니라 하나의 집.
  철칙: 철학 없는 물건은 들이지 않는다. 차별점은 제품 사양이 아니라 '선택의 기준' 그 자체.
  제품: 침대 프레임 · 책장 · 협탁 (한국 큐레이션 가구·라이프스타일).
[4가치] Honest Structure(보이지 않는 곳까지 정직한 구조·소재) · Timelessness(유행 아닌 오래 곁에 둘 형태)
  · Practical Utility(아름다움이 쓰임을 방해하지 않음) · Sincere Discovery(과장 없이 조용히 권함).
[보이스] Quiet · Calm · Honest · Sincere. 과장 X · 느낌표 남발 X · 구구절절 설명 X. 조용히·정확히.
  ✅ DO: "오래 곁에 둘 수 있는 협탁입니다. 머리맡의 하루를 정리합니다."
  ❌ 절대 금지: "초특가! 다양한 기능의 프리미엄 사이드 테이블을 만나보세요!"
[고객] 맞다 = 오래 쓸 것을 고르는 조용한 안목(1인·신혼·미니멀, 가격보다 구조·수명). 아니다 = 최저가·빠른 유행을 좇는 사람.
[CEP — 결핍의 '순간'에서 출발] 늦은밤 머리맡 정리(1인 직장인)→협탁 / 주말 보관 중 독서(책 수집)→책장
  / 이사 첫날 공간의 중심(신혼·독립)→침대 프레임 / 환절기 덜어내기(미니멀)→큐레이션.
[시각 톤] 컬러: Warm Linen #F0E8DD(바탕) · Rosy Taupe #C9B8A3(강조) · Taupe Gray #7F7366 · Obsidian #222222(텍스트). 폰트: Pretendard.
  사진: 부드러운 자연광 · 따뜻한 중성톤 · 넉넉한 여백 · 와비사비 quiet luxury. 제품은 진열이 아니라 '일상의 한 장면' 안에. 과한 보정·로고 노출 금지.
[북극성] 장바구니 → 결제 전환. 단, 전환을 좇되 보이스를 깨지 않는다. 팔려고 안달하는 순간 브랜드가 죽는다.
[철칙] 이 법칙을 어기는 산출물은 폐기하고 다시 쓴다.`

/** 이미지 생성(Imagen)용 영어 스타일 가이드 — 시각 톤 일관. 사진엔 글자/로고를 넣지 않는다(텍스트는 별도 오버레이). */
export const BRAND_IMAGE_STYLE = `MONÉ HOUSE visual tone: warm linen (#F0E8DD) and taupe neutral palette, soft natural light, generous negative space, wabi-sabi quiet luxury, editorial interior photography. The furniture sits within a real daily-life scene, never a showroom display. No text, no logos, no people's faces, no heavy color grading.`
