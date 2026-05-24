#!/usr/bin/env bash
#
# 비개발자용 챗 수집 설치 패키지 빌드.
#   bash scripts/build-chat-installer.sh
# 결과: dist/totaro-chat-setup.zip  (비개발자에게 이 zip 만 전달)
#   안에 더블클릭 "설치.command" + 바이너리(arm64/x64). Node·claude CLI·git 전부 불필요.
#
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT="dist/totaro-chat-setup"
rm -rf "$OUT"; mkdir -p "$OUT"

echo "── 바이너리 컴파일 ──"
bun build scripts/chat-raw-uploader.mjs --compile --target=bun-darwin-arm64 \
  --outfile "$OUT/totaro-chat-uploader-arm64"
if bun build scripts/chat-raw-uploader.mjs --compile --target=bun-darwin-x64 \
  --outfile "$OUT/totaro-chat-uploader-x64" 2>/dev/null; then
  echo "  arm64 + x64 빌드됨"
else
  echo "  arm64 만 빌드됨 (x64 크로스컴파일 스킵 — Intel Mac 직원 있으면 그 맥에서 다시 빌드)"
fi

echo "── 설치.command 생성 ──"
cat > "$OUT/설치.command" <<'CMD'
#!/bin/bash
# totaro 작업기록 설치 — 더블클릭으로 실행
DIR="$(cd "$(dirname "$0")" && pwd)"

MEMBER=$(osascript <<'OSA'
try
  set r to text returned of (display dialog "totaro 작업기록 설치

본인 이름을 입력하세요 (예: 준빈)" default answer "" with title "totaro 설치" buttons {"취소", "설치"} default button "설치")
  return r
on error
  return ""
end try
OSA
)
MEMBER="$(echo "$MEMBER" | xargs)"
if [ -z "$MEMBER" ]; then exit 0; fi

# 아키텍처에 맞는 바이너리 선택
if [ "$(uname -m)" = "arm64" ]; then BIN="totaro-chat-uploader-arm64"; else BIN="totaro-chat-uploader-x64"; fi
if [ ! -f "$DIR/$BIN" ]; then
  osascript -e "display dialog \"이 맥($(uname -m))용 파일이 없습니다. 관리자에게 문의하세요.\" buttons {\"확인\"} with title \"totaro\""
  exit 1
fi

# 바이너리 설치 + 격리속성 제거(Gatekeeper)
mkdir -p "$HOME/.totaro/bin"
cp "$DIR/$BIN" "$HOME/.totaro/bin/totaro-chat-uploader"
chmod +x "$HOME/.totaro/bin/totaro-chat-uploader"
xattr -dr com.apple.quarantine "$HOME/.totaro/bin/totaro-chat-uploader" 2>/dev/null || true

# launchd 에이전트 (로그인 때마다 + 매일 새벽)
LABEL="com.totaro.worktool.chatupload"
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
    <string>$HOME/.totaro/bin/totaro-chat-uploader</string>
    <string>$MEMBER</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$HOME/.totaro/chatupload.log</string>
  <key>StandardErrorPath</key><string>$HOME/.totaro/chatupload.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

osascript -e "display dialog \"설치 완료 ✅  ($MEMBER)

이제 컴퓨터를 켜면 Claude 대화가 자동으로 회사 워크툴에 기록됩니다. 따로 하실 건 없습니다.\" buttons {\"확인\"} with title \"totaro 설치 완료\""
CMD
chmod +x "$OUT/설치.command"

echo "── 사용설명 추가 ──"
cat > "$OUT/읽어보세요.txt" <<'TXT'
totaro 작업기록 설치

1) "설치.command" 를 더블클릭하세요.
2) "확인 안 된 개발자" 경고가 뜨면:
   → 파일을 마우스 우클릭(또는 Control+클릭) → "열기" → "열기"
3) 이름을 입력하고 "설치" 를 누르면 끝입니다.

이후 컴퓨터를 켤 때마다 Claude 대화가 자동으로 회사 워크툴에 기록됩니다.
설치/문의: 태준
TXT

echo "── 압축 ──"
( cd dist && rm -f totaro-chat-setup.zip && zip -rq totaro-chat-setup.zip totaro-chat-setup )
echo ""
echo "✅ dist/totaro-chat-setup.zip 완성 — 비개발자에게 이 zip 전달"
ls -lh dist/totaro-chat-setup.zip | awk '{print "   크기:", $5}'
