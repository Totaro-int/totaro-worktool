/**
 * Agent Platform smoke test — MCP write 핸들러를 로컬에서 직접 호출해
 * 코드 + Supabase 전체 경로를 검증한다 (배포 불필요).
 *
 * 실행: set -a; source .env.local; set +a; npx tsx scripts/smoke-agent-platform.ts
 */
import {
  handleAgentActionsRecent,
  handleEntityLink,
  handleLabelList,
  handleMemorySearch,
  handleMemoryWrite,
} from '../lib/mcp/agent-handlers'

async function main(): Promise<void> {
  console.log('── ① label_list (axis) ──')
  console.log(await handleLabelList({ kind: 'axis' }))

  console.log('\n── ② memory_write (kim-sahyun, company scope) ──')
  console.log(
    await handleMemoryWrite({
      agent: 'kim-sahyun',
      content: 'Agent Platform smoke test — MCP write 경로 가동 확인',
      scope: 'company',
      kind: 'observation',
      confidence: 0.9,
    })
  )

  console.log('\n── ③ memory_search ──')
  console.log(await handleMemorySearch({ query: 'smoke test', agent: 'kim-sahyun' }))

  console.log('\n── ④ entity_link (platform: 토타로 워크툴) ──')
  console.log(
    await handleEntityLink({
      agent: 'kim-sahyun',
      name: '토타로 워크툴',
      kind: 'platform',
      summary: '사내 업무 관리 도구 — 회사 두뇌의 UI',
    })
  )

  console.log('\n── ⑤ agent_actions_recent (감사 로그) ──')
  console.log(await handleAgentActionsRecent({ limit: 5 }))

  console.log('\n✅ smoke test 통과')
}

main().catch((e) => {
  console.error('❌ smoke test 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
