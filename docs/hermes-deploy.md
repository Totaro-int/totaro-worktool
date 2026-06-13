# Hermes 에이전트 직원 배포 가이드 (Oracle VM)

토타로 "AI 직원" (김사현·최지안·심재학)을 Oracle Always Free VM 에 상주시키는 절차.
회사 두뇌(Supabase + MCP)는 이미 가동 중 — 이 문서는 몸체(Hermes) 설치만 다룬다.

## 아키텍처

```
Oracle VM (Ubuntu 24.04, 24시간 상주)
 └─ Hermes Agent
     ├─ 모델: Gemini 2.5 Flash (OpenAI 호환 엔드포인트, 무료 쿼터)
     ├─ MCP(HTTP): https://totaro-worktool.vercel.app/api/mcp (Bearer 토큰)
     │   → 회사 두뇌 읽기/쓰기 (기억·라벨·엔티티·태스크·감사로그)
     ├─ 내장 cron: ~/.hermes/cron/jobs.json — 김사현 매일 08:00 KST 다이제스트
     └─ 시스템 crontab: 매분 `hermes cron tick` (스케줄러 역할)
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
3. `~/.hermes/config.yaml` 작성 (Gemini 모델 + totaro MCP)
4. VM 타임존 **Asia/Seoul**
5. 시스템 crontab 에 `* * * * * hermes cron tick` (스케줄러)
6. **김사현 일일 잡** 등록 (`hermes cron create`, 08:00 KST)

## 검증

```bash
source ~/.bashrc
hermes cron list            # "김사현 일일 트렌드 다이제스트" 가 보이면 등록 OK
hermes cron run <job_id>    # 지금 즉시 한 번 실행 → 다이제스트 품질 확인

# 회사 두뇌(MCP) 연결 확인 — TUI 진입
hermes
  > totaro 의 label_list 도구로 axis 라벨 보여줘
  → 8축(01 AI 소싱 … 99 분류미정)이 나오면 MCP 연결 OK
  > totaro 로 memory_write 테스트 (agent: kim-sahyun, content: "설치 검증")
  → "기억 저장됨 (id: ...)" 반환
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
- **Gemini 호환 오류** → `config.yaml` 의 model 블록을 OpenRouter 경유로 교체
  (cli-config.yaml.example 주석 참고). Anthropic 키도 폴백 가능.
