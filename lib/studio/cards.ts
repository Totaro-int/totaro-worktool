/** 카드레터 한 장. photo = data URL(배경 업로드) 또는 null(단색 Warm Linen). 스튜디오 공유 타입. */
export type Card = { kicker: string; headline: string; sub: string; photo: string | null }

/** 첫 진입 시 기본 8장 (협탁 카드뉴스 샘플). */
export const SEED: Card[] = [
  {
    kicker: '01 / 08',
    headline: '머리맡의 하루를\n조용히 정리합니다',
    sub: '오래 곁에 둘 협탁 한 점',
    photo: null,
  },
  {
    kicker: '02 / 08',
    headline: '늦은 밤,\n손이 닿는 곳에',
    sub: '1인 가구의 머리맡',
    photo: null,
  },
  {
    kicker: '03 / 08',
    headline: '책 한 권, 안경,\n물 한 잔',
    sub: '필요한 것만 가까이',
    photo: null,
  },
  {
    kicker: '04 / 08',
    headline: '흔들림 없는\n원목 상판',
    sub: '오래 쓰도록 만든 두께',
    photo: null,
  },
  { kicker: '05 / 08', headline: '서랍은\n소리 없이 닫힙니다', sub: '조용한 마감', photo: null },
  { kicker: '06 / 08', headline: '좁은 방에도\n넉넉하게', sub: '폭 420mm', photo: null },
  {
    kicker: '07 / 08',
    headline: '오래 곁에 둘\n한 점',
    sub: '유행 대신 곁에 두는 것',
    photo: null,
  },
  { kicker: '08 / 08', headline: 'MONÉ HOUSE', sub: '협탁 둘러보기 →', photo: null },
]
