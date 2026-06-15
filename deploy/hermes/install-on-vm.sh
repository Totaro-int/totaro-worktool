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
# 모델: gemini-2.5-flash. 주의 — 키마다 무료 티어 모델/한도가 다르다. totaro 키는
# gemini-2.0-flash 가 한도 0(미지원)이고 gemini-2.5-flash 만 된다. 단 무료 버스트
# 한도가 낮아 연구 많은 에이전트 루프는 429(rate limit)로 막힐 수 있다 → 안정 운영은
# Google AI Studio 에서 빌링(유료) 활성화 권장 (2.5-flash 는 매우 저렴, 일 다이제스트=월 몇 센트).
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
# 모델: 네이티브 gemini 프로바이더. cron 스케줄러는 model.default 를 모델명으로 읽고,
# API 키는 GEMINI_API_KEY/GOOGLE_API_KEY ENV 에서 resolve 한다 (config.model.api_key 가 아님).
# 그래서 api_key 는 리터럴 \${GEMINI_API_KEY} 자리표시자로 두고, 키는 게이트웨이 systemd ENV 로 주입한다(아래 [6/7]).
model:
  provider: "gemini"
  default: "${GEMINI_MODEL}"
  api_key: "\${GEMINI_API_KEY}"

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

# ── 6) 스케줄러 — Hermes 게이트웨이를 systemd 시스템 서비스로 설치 ──────────
# 게이트웨이 서비스(hermes-gateway.service)가 cron 스케줄러를 상주 구동한다.
# (raw crontab 'hermes cron tick' 대신: 부팅 후 자동 기동 + 'hermes cron status' 가 인식)
HERMES_BIN="$(command -v hermes)"
mkdir -p "$HOME/.hermes/cron"
DROPIN_DIR="/etc/systemd/system/hermes-gateway.service.d"
DROPIN="$DROPIN_DIR/model-key.conf"
if systemctl list-unit-files hermes-gateway.service >/dev/null 2>&1 \
     && systemctl cat hermes-gateway.service >/dev/null 2>&1; then
  log "[6/7] 게이트웨이 서비스 이미 설치됨 — skip"
else
  log "[6/7] 게이트웨이 설치 (systemd 시스템 서비스, User=ubuntu, 부팅 자동 기동)..."
  # 'gateway install' 은 대화형("지금 시작?/부팅 시 시작?") → yes 로 자동 응답.
  # sudo 환경에 PATH 보존(env)해야 하위 명령이 hermes/uv 를 찾는다.
  yes | sudo env "PATH=$PATH" "$HERMES_BIN" gateway install --system --run-as-user ubuntu
fi

# 모델 키를 게이트웨이 systemd ENV 로 주입 — dotenv(~/.hermes/.env)는 systemd 서비스
# 환경에 로드되지 않으므로 drop-in 으로 직접 넣어야 한다. 세 변수 모두 = Gemini 키.
# (gateway install 로 유닛이 생긴 뒤에 작성해야 daemon-reload 가 인식한다.)
log "    모델 키 drop-in 작성: $DROPIN"
sudo mkdir -p "$DROPIN_DIR"
sudo tee "$DROPIN" >/dev/null <<EOF
[Service]
Environment="GEMINI_API_KEY=${GEMINI_API_KEY}"
Environment="GOOGLE_API_KEY=${GEMINI_API_KEY}"
Environment="OPENAI_API_KEY=${GEMINI_API_KEY}"
EOF
sudo chmod 600 "$DROPIN"
sudo systemctl daemon-reload
sudo systemctl restart hermes-gateway.service 2>/dev/null || true
log "    게이트웨이 설치 완료 ('hermes cron status' 에 Gateway is running 표시)"

# ── 7) 김사현 일일 트렌드 다이제스트 잡 자동 등록 (KST 08:00) ──────────────
# cron 경로는 config 의 model.default 를 모델로 쓰므로 잡별 모델 오버라이드 불필요.
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
  hermes cron status          # "Gateway is running" 이면 스케줄러 OK
  hermes cron list            # 김사현 잡이 보이면 OK
  hermes cron run <job_id>    # 지금 즉시 한 번 돌려 다이제스트 확인

  회사 두뇌(MCP) 연결 확인:
    hermes mcp test totaro    # axis 라벨 등 도구 목록 → 200 이면 OK (401 이면 트러블슈팅 참고)
    # 주의: 'hermes -z'/TUI 는 MCP 도구를 로드하지 않는다(게이트웨이/cron 컨텍스트만 로드).
    #       MCP 동작은 'hermes cron run <id>' 로 검증할 것.

  잡이 자동 등록 안 됐으면 직접:
    hermes cron create --schedule "0 8 * * *" \
      --name "김사현 일일 트렌드 다이제스트" --prompt "<kim-sahyun.md 의 지시>"
────────────────────────────────────────────────────────────
NEXT
