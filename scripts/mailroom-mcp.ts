#!/usr/bin/env tsx
/**
 * 토타로 워크툴 MCP 서버 — stdio transport (Claude Desktop / Claude Code 용).
 *
 * 핸들러·도구 정의는 lib/mcp/{handlers,tools}.ts 에 있고
 * HTTP transport (app/api/mcp/route.ts) 와 공유한다.
 *
 * Claude Desktop 등록 (한 번만):
 *   claude mcp add files /Users/yuntaejun/dev/totaro-worktool/scripts/mailroom-mcp.ts
 *
 * 또는 ~/Library/Application Support/Claude/claude_desktop_config.json 의 mcpServers 에 직접:
 *   "files": {
 *     "command": "npx",
 *     "args": ["tsx", "/Users/yuntaejun/dev/totaro-worktool/scripts/mailroom-mcp.ts"]
 *   }
 *
 * 노출 도구 (7개):
 *   mailroom_search · mailroom_search_semantic · mailroom_read · mailroom_list
 *   tasks_list · members_list · mailroom_upload
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { dispatchTool } from '../lib/mcp/handlers'
import { TOOLS } from '../lib/mcp/tools'

const server = new Server(
  { name: 'totaro-worktool', version: '0.2.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params
  try {
    const text = await dispatchTool(name, args as Record<string, unknown>)
    return { content: [{ type: 'text', text }] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { content: [{ type: 'text', text: `❌ 에러: ${msg}` }], isError: true }
  }
})

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr 에 시작 로그 (stdout 은 MCP 프로토콜 전용)
  process.stderr.write(
    `[mcp:stdio] 시작됨 — 도구 ${TOOLS.length}개: ${TOOLS.map((t) => t.name).join(' · ')}\n`
  )
}

main().catch((e) => {
  process.stderr.write(`[mcp:stdio] 치명적 오류: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
