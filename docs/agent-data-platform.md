# Agent Data Platform v1 — Hermes 호환 DB 설계

> 적용 SQL: `supabase/agent-platform.sql` (멱등 — SQL Editor에 통째로 실행)

## 왜 만들었나

Hermes 에이전트를 "회사 직원"으로 들이려고 분석한 결과:

| Hermes 자체 구조                                       | 한계                                                |
| ------------------------------------------------------ | --------------------------------------------------- |
| MEMORY.md / USER.md (로컬 파일, § 구분자, 글자수 제한) | VM 한 대에 갇힘 — 회사 공유 두뇌가 아님             |
| FTS5 SQLite 세션 검색                                  | 그 에이전트의 세션만 검색                           |
| 외부 메모리 프로바이더 (Honcho 등 1개)                 | 외부 SaaS 종속, 회사 데이터와 분리됨                |
| **MCP — HTTP URL + headers 지원**                      | **← 우리가 쓸 통로. 워크툴 `/api/mcp`에 바로 붙음** |

결론: **에이전트의 지능은 모델이 아니라 MCP로 접근하는 회사 데이터 품질이 결정한다.**
회사 지식·행동·라벨을 Supabase에 중앙화하고 Hermes는 MCP로 읽고 쓴다.
에이전트가 늘어나도(김사현→최지안→심재학) 같은 두뇌를 공유한다.

## 기존 스키마의 3가지 갭 → 5계층 해결

사용자 진단 그대로: ① 맥락 분석 부족, ② 사람/에이전트 데이터 분리 없음, ③ 라벨링 부족.

```
                ┌─ 사람 ───────────┐      ┌─ 에이전트 ──────────┐
 행위자(Actor)  │ members           │      │ agents ①            │
                └──────┬───────────┘      └──────┬──────────────┘
                       │      모든 행동 기록      │
 감사(Audit)           │   activities / claude_logs│ agent_actions ②
                       ▼                          ▼
 지식(Knowledge)  inbox_documents · tasks · contacts · cash_snapshots ...
                       ▲                          ▲
 라벨(Label) ④    labels(통제 어휘) ←─ item_labels(폴리모픽) — 사람·에이전트 모두 부착
 맥락(Context) ⑤  entities(회사·사람·제품·지원사업) ←─ entity_mentions
 기억(Memory) ③   agent_memories — scope(agent/team/company)·출처·신뢰도·만료
```

### 설계 원칙

1. **기존 테이블 무변경.** 라벨·맥락은 폴리모픽 조인(`item_labels`, `entity_mentions`)으로 부착 — 마이그레이션 리스크 0.
2. **사람/에이전트 분리는 신원에서 시작.** `agents`는 `members`와 별도 테이블. 모든 에이전트 행동은 `agent_actions`에 남는다 (tool 이름, 대상, 요약, 성공 여부, 지연시간).
3. **라벨은 자유 텍스트 금지.** `labels`가 통제 어휘 (8축 분류·문서유형·부서 시드 포함). 각 라벨의 `description`이 에이전트가 분류할 때 읽는 정의문이다 — 라벨 추가할 때 정의문을 빼먹으면 라벨링 품질이 떨어진다.
4. **기억에는 출처가 필수.** `agent_memories.source_table/source_id` — "어디서 알게 됐나" 없는 기억은 검증 불가. `confidence`와 `expires_at`으로 신뢰도·시한 관리.
5. **쓰기는 전부 MCP 서버 경유.** RLS: 사람(authenticated)은 모든 agent\_\* 테이블 **읽기 가능**(투명성), 쓰기는 service_role만 — 에이전트에 DB 직결 권한을 주지 않는다.

## 데이터 흐름 (김사현 v1 예시)

```
08:00 cron → Hermes(김사현)
  1. MCP: mailroom_search · labels 조회 (회사 맥락 로드)
  2. 웹 트렌드 조사 (Hermes 자체 browser/search tool)
  3. MCP: mailroom_upload (다이제스트 → /05 마케팅·콘텐츠/)
  4. MCP: memory_write — "샐러드 간편식 검색량 2주째 상승" (source: 다이제스트 문서)
  5. MCP: label_attach — 다이제스트에 axis-05 + doc-report 부착
  6. agent_actions 자동 기록 (각 write 마다)
  7. Telegram 보고
```

## Hermes 연결 설정 (VM 쪽, 참고)

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  totaro:
    url: https://totaro-worktool.vercel.app/api/mcp
    headers:
      Authorization: 'Bearer <에이전트 전용 토큰>'
```

## 다음 단계 (구현 순서)

- [x] ① 스키마 마이그레이션 (`agent-platform.sql`)
- [ ] ② MCP write tools: `memory_write/search`, `label_attach`, `entity_link`, `tasks_create`, `agent_action_log` (lib/mcp/tools.ts + handlers.ts)
- [ ] ③ 에이전트 인증: agents별 토큰 발급 → MCP 헤더 검증 → agent_id 자동 식별
- [ ] ④ Oracle VM: Hermes 설치 + Gemini 연결 + 김사현 cron + Telegram
- [ ] ⑤ 백필: agent_memories.embedding (기존 embedText 재사용), inbox_documents 라벨 일괄 부착
