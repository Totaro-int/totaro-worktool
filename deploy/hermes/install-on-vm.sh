#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# 토타로 Hermes 에이전트 — Oracle VM 원샷 설치 (Ubuntu 24.04)
#
# E2.1.Micro(1GB RAM) 같은 작은 인스턴스 전제: Hermes 설치는 Python/Node 빌드라
# 1GB 로는 OOM 위험 → 가장 먼저 swap 6GB 를 잡는다. A1(24GB) 이면 swap 단계는
# 자동 skip 된다.
#
# 사용법 (VM ssh 접속 후):
#   export GEMINI_API_KEY='AIza...'         # https://aistudio.google.com/apikey
#   export MCP_BEARER_TOKEN='...'           # Vercel env 의 MCP_BEARER_TOKEN 과 동일
#   export TELEGRAM_BOT_TOKEN='...'         # (선택) @BotFather. 없으면 게이트웨이 skip
#   bash install-on-vm.sh
#
# 멱등: 여러 번 실행해도 안전.
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

log() { printf '\n\033[1;36m[hermes-install]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[hermes-install ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

# ── 0) 시크릿 확인 ────────────────────────────────────────────────────────
: "${GEMINI_API_KEY:?GEMINI_API_KEY 환경변수 필요 — export GEMINI_API_KEY=...}"
: "${MCP_BEARER_TOKEN:?MCP_BEARER_TOKEN 환경변수 필요 — export MCP_BEARER_TOKEN=...}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
MCP_URL="${MCP_URL:-https://totaro-worktool.vercel.app/api/mcp}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

TOTAL_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
log "감지된 RAM: ${TOTAL_MB}MB"

# ── 1) swap 6GB (RAM < 4GB 일 때만) ───────────────────────────────────────
if [ "$TOTAL_MB" -lt 4000 ]; then
  if sudo swapon --show 2>/dev/null | grep -q '/swapfile'; then
    log "[1/6] swap 이미 활성 — skip"
  else
    log "[1/6] swap 6GB 생성 (1GB RAM 보완, OOM 방지)..."
    sudo fallocate -l 6G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=6144 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-hermes-swap.conf >/dev/null
    sudo sysctl -p /etc/sysctl.d/99-hermes-swap.conf >/dev/null
    log "    swap 활성: $(free -h | awk '/Swap/ {print $2}')"
  fi
else
  log "[1/6] RAM 충분 (${TOTAL_MB}MB) — swap 생략"
fi

# ── 2) 시스템 패키지 ──────────────────────────────────────────────────────
log "[2/6] 시스템 패키지 (curl, git, build-essential)..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl git build-essential ca-certificates >/dev/null

# ── 3) Hermes 설치 (uv·python3.11·node·ripgrep·ffmpeg 자동) ───────────────
export PATH="$HOME/.local/bin:$PATH"
if command -v hermes >/dev/null 2>&1; then
  log "[3/6] Hermes 이미 설치됨 — skip ($(command -v hermes))"
else
  log "[3/6] Hermes 설치 중 (수 분 소요)..."
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
fi
grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null \
  || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
command -v hermes >/dev/null 2>&1 || die "hermes 명령을 찾을 수 없음. 'source ~/.bashrc' 후 재시도."

# ── 4) config.yaml 배치 (모델 + 회사 두뇌 MCP) ────────────────────────────
log "[4/6] ~/.hermes/config.yaml 작성..."
mkdir -p "$HOME/.hermes"
cat > "$HOME/.hermes/config.yaml" <<EOF
# 토타로 Hermes 에이전트 — install-on-vm.sh 가 생성. 수동 편집 가능.
model:
  provider: "custom"
  base_url: "https://generativelanguage.googleapis.com/v1beta/openai"
  model: "${GEMINI_MODEL}"
  api_key: "${GEMINI_API_KEY}"

mcp_servers:
  totaro:
    url: "${MCP_URL}"
    headers:
      Authorization: "Bearer ${MCP_BEARER_TOKEN}"
    timeout: 120
EOF
chmod 600 "$HOME/.hermes/config.yaml"

# ── 5) VM 타임존 Asia/Seoul (cron·다이제스트 날짜를 한국 기준으로) ─────────
log "[5/7] 타임존 Asia/Seoul..."
sudo timedatectl set-timezone Asia/Seoul 2>/dev/null || true

# ── 6) 시스템 crontab: 매분 'hermes cron tick' (= Hermes 스케줄러 데몬 역할) ─
# Hermes 의 cron tick 은 단발성(due 된 잡만 실행)이라 매분 호출이 정석.
log "[6/7] 스케줄러 — crontab 에 'hermes cron tick' 매분 등록..."
HERMES_BIN="$(command -v hermes)"
TICK_LINE="* * * * * PATH=$HOME/.local/bin:/usr/bin:/bin $HERMES_BIN cron tick >> $HOME/.hermes/cron/tick.log 2>&1"
mkdir -p "$HOME/.hermes/cron"
( crontab -l 2>/dev/null | grep -v 'hermes cron tick' ; echo "$TICK_LINE" ) | crontab -
log "    crontab 등록 완료 (매분 tick)"

# ── 7) 김사현 일일 트렌드 다이제스트 잡 자동 등록 (KST 08:00) ──────────────
log "[7/7] 김사현 일일 잡 등록 (08:00 KST)..."
read -r -d '' KIM_PROMPT <<'PROMPT' || true
너는 토타로 마케팅부 에이전트 김사현이다. MCP 도구의 agent 파라미터는 항상 "kim-sahyun".

오늘의 작업:
1) PoC(건강식품) + E커머스 콘텐츠 트렌드를 조사한다.
   - 네이버 데이터랩 건강식품·뷰티 급상승 검색어
   - 네이버쇼핑·쿠팡 건강식품 베스트 순위 변동
   - 국내 이커머스/마케팅 뉴스 헤드라인
   - 경쟁사 스마트스토어·SNS 신규 콘텐츠 동향
2) 재사용 가치 있는 사실은 memory_write(scope: company 또는 agent, 출처 포함).
   새 업체·제품·경쟁사는 entity_link 로 등록.
3) 다이제스트 작성:
   [오늘의 트렌드 — {날짜}]
   1~5. 트렌드 한 줄 + 왜 우리에게 중요한지
   [콘텐츠 소재 3개] 각 헤드라인 + 한 줄 기획의도
   [액션 제안] 오늘 바로 만들 콘텐츠 1개 추천
4) totaro MCP 의 mailroom_upload 로 "/05 마케팅·콘텐츠/일일 트렌드/" 에
   "트렌드-{날짜}.md" 저장하고 결과를 한 줄로 알린다. (텔레그램 연결 시 텔레그램도)
조사 출처 URL 을 끝에 각주로. 지어내지 마라. 해외 IP 라 네이버 캡차 뜨면 그 소스는
건너뛰고 "○○ 차단됨"을 명시. 콘텐츠 게시는 자동화하지 말 것(초안까지만).
PROMPT

DELIVER_ARG=()
[ -n "$TELEGRAM_BOT_TOKEN" ] && DELIVER_ARG=(--deliver telegram)

if "$HERMES_BIN" cron create \
      --schedule "0 8 * * *" \
      --name "김사현 일일 트렌드 다이제스트" \
      --prompt "$KIM_PROMPT" \
      "${DELIVER_ARG[@]}" >/dev/null 2>&1; then
  log "    김사현 잡 등록 완료 (매일 08:00 KST)"
else
  log "    (자동 등록 실패 — 아래 명령을 직접 실행하거나 hermes TUI 에서 /cron create)"
fi

# ── 완료 ──────────────────────────────────────────────────────────────────
log "설치 완료. 검증을 진행하세요."
cat <<'NEXT'

────────────────────────────────────────────────────────────
검증 (사람이 한 번):
  source ~/.bashrc
  hermes cron list            # 김사현 잡이 보이면 OK
  hermes cron run <job_id>    # 지금 즉시 한 번 돌려 다이제스트 확인

  회사 두뇌 연결 확인:
    hermes                    # TUI 진입 후
    > totaro 의 label_list 도구로 axis 라벨 보여줘
    → 8축(01 AI 소싱 … 99 분류미정)이 나오면 MCP 연결 OK

  잡이 자동 등록 안 됐으면 직접:
    hermes cron create --schedule "0 8 * * *" \
      --name "김사현 일일 트렌드 다이제스트" --prompt "<kim-sahyun.md 의 지시>"
────────────────────────────────────────────────────────────
NEXT
