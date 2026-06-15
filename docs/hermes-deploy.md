# Hermes 에이전트 직원 배포 가이드 (Oracle VM)

토타로 "AI 직원" (김사현·최지안·심재학)을 Oracle Always Free VM 에 상주시키는 절차.
회사 두뇌(Supabase + MCP)는 이미 가동 중 — 이 문서는 몸체(Hermes) 설치만 다룬다.

## 아키텍처

```
Oracle VM (Ubuntu 24.04, 24시간 상주)
 └─ Hermes Agent
     ├─ 모델: Gemini 2.0 Flash (네이티브 gemini 프로바이더, 무료 15 req/min)
     ├─ MCP(HTTP): https://totaro-worktool.vercel.app/api/mcp (Bearer 토큰)
     │   → 회사 두뇌 읽기/쓰기 (기억·라벨·엔티티·태스크·감사로그)
     ├─ 내장 cron: ~/.hermes/cron/jobs.json — 김사현 매일 08:00 KST 다이제스트
     └─ hermes-gateway.service (systemd, User=ubuntu, 부팅 자동 기동)
         → cron 스케줄러 상주 구동. 키는 systemd drop-in 으로 주입.
```

## 쉐이프 선택 — A1 우선, 없으면 E2.1.Micro

| 쉐이프                           | RAM    | 비고                                                             |
| -------------------------------- | ------ | ---------------------------------------------------------------- |
| **VM.Standard.A1.Flex** (ARM)    | 2~24GB | 권장. 단 도쿄/오사카 무료 슬롯이 자주 매진("Out of capacity")    |
| **VM.Standard.E2.1.Micro** (AMD) | 1GB    | 항상 여유. install 스크립트가 **swap 6GB 를 먼저 잡아** OOM 방지 |

> A1 매진 시 E2.1.Micro 로 시작 → 나중에 A1 풀리면 이사. 둘 다 Always Free.

## 사전 준비 (사람)

1. **Oracle VM** 생성: Ubuntu 24.04, 홈 리전 도쿄/오사카, Public IP 할당.
   인스턴스 생성 시 받은 **SSH private key** 보관 (한 번만 다운로드됨).
2. **Gemini API 키**: https://aistudio.google.com/apikey
3. **MCP_BEARER_TOKEN**: Vercel → totaro-worktool → Settings → Env 의 `MCP_BEARER_TOKEN` 값.
4. (선택) **Telegram 봇 토큰**: @BotFather → `/newbot`. 없으면 다이제스트는 우편실에 저장된다.

## 설치 — 원샷 스크립트

`deploy/hermes/install-on-vm.sh` 와 `deploy/hermes/kim-sahyun.md` 를 VM 으로 복사한 뒤:

```bash
# 1) 로컬에서 스크립트 + 프로필 업로드 (KEY = 다운받은 SSH 키)
KEY=~/Downloads/ssh-key-*.key
IP=<VM_PUBLIC_IP>
chmod 600 $KEY
scp -i $KEY deploy/hermes/install-on-vm.sh deploy/hermes/kim-sahyun.md ubuntu@$IP:~/

# 2) VM 접속
ssh -i $KEY ubuntu@$IP

# 3) VM 안에서 — 시크릿 주입 후 실행 (한 방)
export GEMINI_API_KEY='AIza...'
export MCP_BEARER_TOKEN='...'
export TELEGRAM_BOT_TOKEN='...'   # 선택, 없으면 생략
bash install-on-vm.sh
```

스크립트가 자동으로:

1. RAM < 4GB 면 **swap 6GB** 생성 (E2.1.Micro OOM 방지)
2. 시스템 패키지 + **Hermes 설치** (uv·python3.11·node·ripgrep·ffmpeg 자동)
3. `~/.hermes/config.yaml` 작성 (Gemini 2.0 Flash 네이티브 프로바이더 + totaro MCP)
4. VM 타임존 **Asia/Seoul**
5. **게이트웨이 systemd 서비스** 설치 (`hermes gateway install --system`, 부팅 자동 기동
   = cron 스케줄러) + 모델 키 drop-in (`/etc/systemd/system/hermes-gateway.service.d/model-key.conf`)
6. **김사현 일일 잡** 등록 (`hermes cron create`, 08:00 KST)

## 검증

```bash
source ~/.bashrc
hermes cron status          # "Gateway is running" 이면 스케줄러(게이트웨이) OK
hermes cron list            # "김사현 일일 트렌드 다이제스트" 가 보이면 등록 OK
hermes cron run <job_id>    # 지금 즉시 한 번 실행 → 다이제스트 품질 확인

# 회사 두뇌(MCP) 연결 확인
hermes mcp test totaro      # axis 라벨 등 도구 목록 반환 → 200 이면 OK (401 이면 트러블슈팅 참고)
# 주의: 'hermes -z'/TUI 는 MCP 도구를 로드하지 않는다 — 게이트웨이/cron 컨텍스트만 로드한다.
#       그래서 MCP 동작 검증은 TUI 가 아니라 'hermes cron run <id>' 로 한다.
```

그리고 워크툴에서 교차 확인:

- Supabase `agent_actions` 테이블에 방금 행동이 기록됐는지
- `/hub` 또는 MCP `agent_actions_recent` 로 "[김사현] memory_write ..." 보임

## 운영

- **다이제스트 산출물**: `~/.hermes/cron/output/<job_id>/<timestamp>.md` 에 저장.
  - 프롬프트가 `mailroom_upload` 로 우편실 "/05 마케팅·콘텐츠/일일 트렌드/" 에도 올린다.
  - 텔레그램 연결 시 `--deliver telegram` 으로 채팅 발송.
- **즉시 지시**: `hermes` TUI 또는 (게이트웨이 띄웠으면) 텔레그램으로 자연어 명령.
- **잡 수정**: `hermes cron edit <job_id>` / `pause` / `resume` / `remove`.

## 다음 직원 추가 (최지안·심재학)

같은 골격, 잡 프롬프트만 교체:

- **최지안(개발부)**: `agent="choi-jian"`. 매일 Web.Totaro·자사몰·홈페이지 헬스체크 →
  오류 발견 시 진단 리포트 + (가능하면) 수정 PR 초안. 게시·머지는 사람.
- **심재학(운영부)**: `agent="sim-jaehak"`. 매일 기업마당·K-Startup 신규 공고 →
  회사 프로필 대조 → 해당 건 보고 + 마감일을 `tasks_create`(due_date) 로 등록.

각자 `hermes cron create` 한 줄이면 끝 (agent slug 와 프롬프트만 바꾼다).

## 에이전트 행동 원칙 (모든 잡 프롬프트에 포함)

1. MCP 도구 호출 시 `agent` 파라미터는 본인 slug (kim-sahyun / choi-jian / sim-jaehak).
2. 알게 된 사실은 `memory_write` (출처·신뢰도 포함). 다음 날 본인+동료가 재사용.
3. 분류는 `label_list` 로 통제 어휘 확인 후 `label_attach`. 자유 라벨 금지.
4. 새 거래처·제품·지원사업은 `entity_link`. 같은 이름 재등록 무해(멱등).
5. 모든 행동은 `agent_actions` 에 자동 기록됨 — 사람이 검토.
6. 외부 게시·머지·송금은 자동화 금지. 초안·보고까지만.

## 트러블슈팅

- **`hermes: command not found`** → `source ~/.bashrc` (PATH 에 `~/.local/bin` 추가됨).
- **설치 중 멈춤/OOM (E2.1.Micro)** → `free -h` 로 swap 확인. 없으면 스크립트 [1/7] 재실행.
- **네이버 캡차** → 도쿄 IP 라 한국 사이트가 봇 차단할 수 있음. 프롬프트가 "차단된 소스는
  건너뛰고 명시"하게 돼 있음. 심하면 한국 프록시 또는 검색 API 경유로 전환.
- **모델 키가 안 먹힘 / 게이트웨이가 모델 호출 실패** → cron 스케줄러는 키를
  `config.model.api_key` 가 아니라 `GEMINI_API_KEY`/`GOOGLE_API_KEY` **ENV** 에서 읽는다.
  dotenv(`~/.hermes/.env`)는 systemd 서비스 환경에 로드되지 **않으므로** 키는 drop-in
  `/etc/systemd/system/hermes-gateway.service.d/model-key.conf` 에 넣어야 한다(스크립트 [6/7] 이 자동 작성).
  수동 수정 시 `sudo systemctl daemon-reload && sudo systemctl restart hermes-gateway`.

- **`hermes mcp test totaro` → 401 (MCP 인증 실패)** → 프로덕션 Vercel 배포에 `MCP_BEARER_TOKEN`
  env 가 없으면 MCP 라우트의 정적 토큰 검사(`checkAuth`)가 실패한다. 두 가지 해결책:
  1. **(가장 깔끔, Vercel 팀 오너 권한 필요)** Vercel 프로덕션 프로젝트
     `songseungjus-projects/totaro-worktool` 에 `MCP_BEARER_TOKEN` = `.env.local` 값으로 추가 후 재배포.

  2. **(Vercel 권한 없이)** Supabase `oauth_tokens` 에 행을 넣어 MCP 라우트의 DB 토큰 경로(path 2)로
     VM 의 기존 토큰을 인증시킨다. VM 에서 해시 계산:

     ```bash
     printf %s "$MCP_BEARER_TOKEN" | sha256sum   # → token_hash
     ```

     그 다음 Supabase SQL:

     ```sql
     -- 1) MCP 클라이언트 한 개 등록 (없으면).
     --    redirect_uris 는 NOT NULL(기본값 없음) → 빈 배열이라도 반드시 넣는다.
     insert into oauth_clients (client_id, client_name, redirect_uris)
     values ('hermes-vm', 'Hermes VM agent', '{}')
     on conflict (client_id) do nothing;

     -- 2) VM 의 Bearer 토큰 해시를 토큰 행으로 삽입
     insert into oauth_tokens (token_hash, client_id, user_id, expires_at)
     values (
       '<위 sha256sum 출력>',
       'hermes-vm',
       (select id from auth.users limit 1),   -- 아무 사용자 id
       '2099-12-31T00:00:00Z'                  -- 먼 미래 만료
     );
     ```

- **`429 / rate limit` (에이전트 루프가 자주 막힘)** → 무료 티어 버스트 한도 초과. **키마다
  무료 모델/한도가 다르다** — totaro 키는 `gemini-2.0-flash` 가 한도 0(미지원)이고
  `gemini-2.5-flash` 만 된다(`limit:0,model:gemini-2.0-flash` 에러로 확인). 단 2.5-flash 도
  무료 버스트 한도가 낮아 **연구가 많은 일일 다이제스트는 호출을 몰아쳐 429 로 실패**할 수 있다
  (가벼운 작업은 OK — e2e 검증 통과). 안정적 풀 다이제스트는 **Google AI Studio 에서 빌링(유료)
  활성화가 정답** (2.5-flash 는 매우 저렴, 일 다이제스트 ≈ 월 몇 센트). 빌링 없이 쓰려면 cron
  프롬프트의 조사 범위·도구 호출 수를 줄여 경량화한다.

- **MCP 도구가 TUI 에서 안 보임** → `hermes -z`/TUI 는 MCP 도구를 로드하지 **않는다**
  (게이트웨이/cron 컨텍스트만 로드). MCP 동작 검증은 `hermes mcp test totaro` 또는
  `hermes cron run <id>` 로 한다.
