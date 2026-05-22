#!/usr/bin/env bash
#
# totaro-worktool 작업 로그 자동 수집 설치 (1인 1회).
#
#   bash scripts/setup-logging.sh "이름"
#   예: bash scripts/setup-logging.sh "승주"
#
# 설치되는 것:
#   1) SessionEnd 훅  — Claude Code/코워크 세션 종료 시 자동 기록 (~/.claude/settings.json)
#   2) launchd 에이전트 — claude.ai 데스크탑 챗을 로그인할 때마다 + 매일 새벽 수집
#      (RunAtLoad 라서 컴퓨터를 껐다 켜도 다음 로그인 때 따라잡음)
#
# 소스가 안 겹쳐서(훅=Code, launchd=챗) 중복 기록이 없습니다.
#
set -euo pipefail

MEMBER="${1:-}"
if [ -z "$MEMBER" ]; then
  echo "사용법: bash scripts/setup-logging.sh \"이름\"   (예: \"승주\")"
  exit 1
fi

# 경로 해석 (이 스크립트가 어디서 실행되든 동작)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER="$SCRIPT_DIR/claude-session-logger.mjs"
CHAT_IMPORTER="$SCRIPT_DIR/import-claude-desktop-chats.mjs"
NODE_BIN="$(command -v node || true)"

echo "── totaro 로그 수집 설치: $MEMBER ──"

# --- 사전 점검 ---
if [ -z "$NODE_BIN" ]; then
  echo "❌ Node.js 가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요."
  exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  claude CLI 가 없습니다 — 요약이 안 만들어집니다."
  echo "    설치: npm i -g @anthropic-ai/claude-code  후  claude 로 한 번 로그인"
  echo "    (지금은 계속 진행합니다. CLI 설치 후 자동으로 요약이 붙습니다.)"
fi
mkdir -p "$HOME/.totaro"

# --- 1) SessionEnd 훅 등록 (~/.claude/settings.json 에 병합) ---
SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"
HOOK_CMD="node $LOGGER \"$MEMBER\""
node -e '
  const fs = require("fs");
  const file = process.argv[1], cmd = process.argv[2];
  let s = {};
  try { s = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  s.hooks = s.hooks || {};
  s.hooks.SessionEnd = Array.isArray(s.hooks.SessionEnd) ? s.hooks.SessionEnd : [];
  const has = JSON.stringify(s.hooks.SessionEnd).includes("claude-session-logger.mjs");
  if (!has) {
    s.hooks.SessionEnd.push({ hooks: [{ type: "command", command: cmd }] });
    fs.writeFileSync(file, JSON.stringify(s, null, 2));
    console.log("  ✅ SessionEnd 훅 추가됨 (Code/코워크 실시간 기록)");
  } else {
    console.log("  • SessionEnd 훅 이미 있음 (건너뜀)");
  }
' "$SETTINGS" "$HOOK_CMD"

# --- 2) launchd 에이전트 등록 (claude.ai 챗 수집) ---
LABEL="com.totaro.worktool.chatsweep"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$CHAT_IMPORTER</string>
    <string>$MEMBER</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$HOME/.totaro/chatsweep.log</string>
  <key>StandardErrorPath</key><string>$HOME/.totaro/chatsweep.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"
echo "  ✅ launchd 에이전트 등록됨 (로그인 시 + 매일 새벽 3시 챗 수집)"

echo ""
echo "🎉 설치 완료 — $MEMBER"
echo "   · Code/코워크: 세션 끝날 때마다 자동"
echo "   · claude.ai 챗: 로그인할 때마다 + 매일 새벽 (컴퓨터 껐다 켜도 따라잡음)"
echo "   · 로그 확인: $HOME/.totaro/chatsweep.log"
echo "   · 해제: launchctl unload \"$PLIST\""
