#!/usr/bin/env bash
#
# Gmail 받은편지함 → 우편실 자동 동기화 설치 (개발기 1회).
#
#   bash scripts/setup-gmail-sync.sh
#
# 설치되는 것:
#   launchd 에이전트 — 매시간 받은편지함을 우편실(Drive + Supabase)로 동기화.
#   RunAtLoad 라서 로그인/리로드 시 즉시 한 번, 이후 StartInterval(1h)마다.
#   중복 방지는 Gmail "토타로:동기화됨" 라벨로 처리 (gmail-sync.ts 내부).
#   같은 라벨의 작업은 launchd 가 동시에 두 번 띄우지 않으므로 자기 자신과 겹치지 않음.
#
# 전제:
#   - .env.local 에 GMAIL_*, SUPABASE_*, Drive 자격증명이 이미 설정됨
#     (scripts/gmail-auth.ts 로 OAuth 를 끝낸 상태)
#   - node / npx / claude CLI 가 /usr/local/bin 에 있음 (분류는 claude CLI 구독 사용)
#
# 끄기:   launchctl unload -w ~/Library/LaunchAgents/com.totaro.worktool.gmailsync.plist
#         rm ~/Library/LaunchAgents/com.totaro.worktool.gmailsync.plist
# 상태:   launchctl list | grep gmailsync
# 로그:   tail -f ~/.totaro/gmailsync.log
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LABEL="com.totaro.worktool.gmailsync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/.totaro/gmailsync.log"
NPX_BIN="$(command -v npx || echo /usr/local/bin/npx)"

echo "── Gmail 동기화 launchd 설치 ──"

# --- 사전 점검 ---
if [ ! -f "$REPO_DIR/.env.local" ]; then
  echo "❌ $REPO_DIR/.env.local 이 없습니다. 먼저 OAuth(scripts/gmail-auth.ts)를 끝내세요."
  exit 1
fi
if ! grep -q '^GMAIL_REFRESH_TOKEN=' "$REPO_DIR/.env.local"; then
  echo "❌ .env.local 에 GMAIL_REFRESH_TOKEN 이 없습니다. scripts/gmail-auth.ts 를 먼저 실행하세요."
  exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  claude CLI 가 PATH 에 없습니다 — 분류가 실패할 수 있습니다 (npm i -g @anthropic-ai/claude-code 후 로그인)."
fi
mkdir -p "$HOME/.totaro"
mkdir -p "$HOME/Library/LaunchAgents"

# --- plist 작성 ---
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NPX_BIN</string>
    <string>tsx</string>
    <string>$REPO_DIR/scripts/gmail-sync.ts</string>
    <string>--days</string>
    <string>2</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
echo "  ✅ plist 작성: $PLIST"

# --- 로드 (재실행 안전) ---
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"
echo "  ✅ launchd 로드됨 — 매시간 동기화 + 로그인/리로드 시 즉시 1회"
echo "     로그: $LOG"
echo ""
echo "끄기:  launchctl unload -w $PLIST && rm $PLIST"
echo "상태:  launchctl list | grep gmailsync"
echo "로그:  tail -f $LOG"
