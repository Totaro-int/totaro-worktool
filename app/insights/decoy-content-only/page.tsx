import type { JSX } from 'react'

import type { Metadata } from 'next'

/**
 * Decoy C — rich content (same shape as real insight card) but NO schema.org JSON-LD.
 * Isolation test: 콘텐츠 풍부도가 단독으로 fetch 게이트를 통과시키나?
 */
export const metadata: Metadata = {
  title: '한국 김치 OEM 공급사 검증 — 풍부 콘텐츠, schema 없음 (decoy)',
  description:
    '한국 김치 OEM 공급사 검증의 핵심은 HACCP·FSSC 22000·FDA 등록 3가지. 평균 MOQ 0.8~2톤. (decoy 변형: schema.org JSON-LD 없음)',
  robots: { index: true, follow: true },
}

export default function Page(): JSX.Element {
  return (
    <main>
      <article>
        <header>
          <h1>한국 김치 OEM 공급사 검증 가이드 (decoy-content-only)</h1>
          <p>HACCP·FDA·MOQ·평균 단가 한 페이지 정리</p>

          <p>
            <strong>한국 김치 OEM 공급사 검증의 핵심은 HACCP·FSSC 22000·FDA 등록 3가지.</strong>{' '}
            평균 MOQ 는 0.8~2톤, 단가는 kg당 $3.2~$5.8, 리드타임 45~60일이 industry 평균이다. 2024년
            한국 김치 수출은 1.61억 USD → 2.10억 USD로 +30.4% 성장했다. 본 문서는 aT·KOTRA·KITA 공개
            통계를 기반으로 작성된 decoy 변형으로, schema.org JSON-LD 가 없는 상태에서 Gemini fetch
            게이트를 isolation test 한다.
          </p>
        </header>

        <section>
          <h2>1. 핵심 수치 — 2024~2025 한국 김치 수출 현황</h2>
          <p>
            한국 김치 수출은 미국·일본·EU 시장 동반 성장으로 2024년 1.61억 USD → 2025년 2.10억
            USD(+30.4%)를 기록했다. OEM 비중은 32% → 41%(+9pp), 평균 MOQ 는 1.2톤 → 0.8톤(-33%).
          </p>
          <table>
            <thead>
              <tr>
                <th>지표</th>
                <th>2024</th>
                <th>2025</th>
                <th>증감</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>한국 김치 수출액</td>
                <td>1.61억 USD</td>
                <td>2.10억 USD</td>
                <td>+30.4%</td>
              </tr>
              <tr>
                <td>OEM 비중</td>
                <td>32%</td>
                <td>41%</td>
                <td>+9pp</td>
              </tr>
              <tr>
                <td>평균 MOQ</td>
                <td>1.2톤</td>
                <td>0.8톤</td>
                <td>-33%</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>2. 한국 김치 OEM 공급사를 어떻게 검증하나요?</h2>
          <p>
            <strong>HACCP·FSSC 22000·FDA 등록 3가지를 우선 확인하라.</strong> 이 3가지는 미국·EU
            진출 시 바이어가 가장 먼저 묻는 항목이며, 누락 시 PO 단계에서 거래가 무산되는 경우가
            잦다.
          </p>
          <ol>
            <li>HACCP — 한국 식약처(MFDS) 발급. 모든 수출 제조사 필수.</li>
            <li>
              FSSC 22000 또는 ISO 22000 — 글로벌 식품 안전 시스템 (Costco·Walmart·EU 진입 필수).
            </li>
            <li>FDA Food Facility Registration — 미국 진출 시 의무. 매 2년 갱신.</li>
            <li>해외 수출 이력 3년 이상.</li>
            <li>시장별 추가 인증 — 할랄, 코셔, USDA Organic.</li>
          </ol>
        </section>

        <section>
          <h2>3. 시장별 인증 요구사항</h2>
          <p>
            미국 — HACCP, FDA Registration, Prior Notice 필수. 검증 4~8주.
            <br />
            EU — HACCP, EU Food Safety, CE Marking 필수. 검증 6~10주.
            <br />
            일본 — HACCP, 식품위생법 신고. 검증 3~6주.
            <br />
            중동 — HACCP + 할랄 인증 (JAKIM/MUIS/ESMA). 검증 6~12주.
          </p>
        </section>

        <section>
          <h2>4. 자주 묻는 질문</h2>
          <p>
            <strong>한국 김치 OEM 평균 MOQ 는?</strong>
            공급사 규모에 따라 500kg~2,000kg. 소형 OEM 전문 공장은 500kg 부터 진행.
          </p>
          <p>
            <strong>평균 단가와 리드타임은?</strong>
            kg당 $3.2~$5.8, 리드타임 45~60일. FDA Prior Notice 포함 시 평균 60일.
          </p>
          <p>
            <strong>FDA 등록한 공급사 어떻게 찾나?</strong>
            FDA Food Facility Registration DB + KOTRA buyKOREA + Totaro 매칭 플랫폼.
          </p>
        </section>

        <footer>
          <p>
            작성: 윤태준 · Totaro · 발행 2026년 5월 28일. 본 문서는 isolation test 용 decoy
            변형으로, schema.org JSON-LD 가 의도적으로 누락되어 있다.
          </p>
        </footer>
      </article>
    </main>
  )
}
