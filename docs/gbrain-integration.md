# gbrain 통합 설계 (B0 스파이크 결과 — 2026-07-04 검증)

김사현(Hermes@Oracle VM)의 두 번째 두뇌로 gbrain 을 붙이기 위한 확정 설계.
로컬(맥)에서 실제 설치·왕복 테스트로 검증한 사실만 기록한다.

## 검증된 사실 (v0.18.2, 맥에서 실측)

| 항목              | 결과                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 설치              | `gstack-gbrain-install` → `~/gbrain` 클론 + `bun link` (bun 1.3.11) ✅                                                  |
| 브레인 init       | `gbrain init --pglite` → `~/.gbrain/brain.pglite` 생성 ✅                                                               |
| put/search        | `put` 페이지 생성·청킹 ✅, `search`(tsvector 키워드) 한국어 "협탁" 매칭 ✅                                              |
| query(하이브리드) | **키 없으면 No results** — 임베딩+쿼리확장이 OpenAI 의존                                                                |
| 임베딩            | **`OPENAI_API_KEY` 전용** (v0.18.2), 모델 `text-embedding-3-large`. base URL 오버라이드 없음 → litellm/Vertex 우회 불가 |
| MCP 서버          | `gbrain serve` = **stdio 전용** (HTTP 없음). initialize+tools/list JSON-RPC 왕복 ✅                                     |
| MCP 툴            | get_page/put_page/delete_page/list_pages/**search**/**query**/add_tag/…                                                 |
| 백엔드            | PGLite(로컬) & **Supabase**(`init --supabase`, `migrate --to supabase`) 지원                                            |

## 아키텍처 확정

```
[맥: 인제스트]                     [Oracle VM: 김사현]
 scripts/brain-ingest ─┐            Hermes ──(stdio MCP)── gbrain serve
                        ├─→ Supabase 브레인 (공유, 단일 진실)
 gbrain put/import ────┘            └─ litellm → Vertex (기존 그대로)
```

- **브레인 백엔드 = Supabase** (기존 프로젝트에 별도 스키마). 맥(인제스트)과 VM(질의)이 같은 브레인을 봄. PGLite는 머신마다 따로라 탈락.
- **Hermes 연결 = stdio MCP** (`gbrain serve` 를 command 로 등록). v0.18.2 에 HTTP 서브가 없으므로 원격 HTTP 안 씀 — 같은 박스라 stdio 가 오히려 단순·빠름.
  - B3 검증 포인트: Hermes 설정이 command(stdio) MCP 를 지원하는지 확인. 미지원 시 폴백 = worktool MCP 에 brain_search/brain_put 프록시 툴 추가(서버에서 Supabase 브레인 직접 조회).
- **역할 분담**: gbrain = 회사 지식·장기기억(브랜드북/전략/보고서 아카이브/제품). worktool MCP = 운영 데이터(우편함/엔티티/할일). 중복 저장 금지.

## 임베딩 키 (유일한 사용자 액션)

- 시맨틱 `query` 를 살리려면 **`OPENAI_API_KEY` 1개 필요** (임베딩+쿼리확장용, 코퍼스 규모상 월 몇백 원 수준).
- **블로커 아님**: 키 전까지 `import --no-embed` + `search`(키워드)로 운용, 키 들어오면 `gbrain embed --all` 한 번으로 소급.
- 키 위치: 맥 셸 env(인제스트용) + VM env(serve용). Vercel 불필요(브레인은 worktool 서버 경유 안 함 — 프록시 폴백 쓸 때만 필요).

## B2 (다음): Supabase 브레인 구축 + 인제스트

1. `gbrain init --supabase` (Session Pooler URL — `gstack-gbrain-supabase-verify` 로 검증, 포트 6543).
2. 인제스트 목록(우선순위순):
   - MONÉ 브랜드북 v2 전문 + `lib/brand/mone.ts`(BRAND_GUIDE/IMAGE_STYLE)
   - TOTARO 전략(소싱 컷·브랜딩 본업·북극성 지표)
   - 김사현 보고서 아카이브(우편함 `05 마케팅·콘텐츠/마케팅 분석/` 전체)
   - 제품 팩트(협탁 W360/W480 스펙·가격·소재), 페르소나·CEP
   - 팀·운영 상식(멤버, 채널, 발행 캘린더)
3. 방법: `scripts/brain-ingest.ts` — Supabase inbox_documents 에서 보고서 md 를 읽어 `gbrain put` 반복(멱등: slug=파일명). 정적 문서는 `gbrain import <dir>`.

## B3 (그다음): VM 연결

1. `deploy/hermes/install-gbrain-on-vm.sh` 작성: bun 설치 → gbrain 클론/link → `GBRAIN_DATABASE_URL`(Supabase pooler) 설정 → smoke(`gbrain search`).
2. Hermes 설정에 stdio MCP 등록(김사현 프로필에 brain 사용 지침 추가 — "주장 전 brain.query 로 근거 검색").
3. 사용자 SSH 1회로 스크립트 실행 → `gbrain search "협탁"` 이 VM에서 결과 내면 완료.

## 리스크·메모

- v0.18.2 는 installer 가 커밋 핀 고정 — 조사 때 본 HTTP serve/코드인덱스(v0.20+)와 다름. **핀 버전 기준으로 설계함** (업그레이드는 나중에 의식적으로).
- `gbrain sources`(코드 인덱스)는 이 버전에서 불안정(installer 경고) — 김사현에겐 불필요라 사용 안 함.
- 한국어: tsvector 키워드 매칭은 확인됨. 시맨틱 품질은 임베딩 키 이후 B5 평가 하네스로 측정.
