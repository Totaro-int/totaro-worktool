# Hermes 에이전트 직원 배포 가이드 (Oracle VM)

토타로 "AI 직원" (김사현·최지안·심재학)을 Oracle Always Free VM 에 상주시키는 절차.
회사 두뇌(Supabase + MCP)는 이미 가동 중 — 이 문서는 몸체(Hermes) 설치만 다룬다.

## 아키텍처

```
Oracle VM (Ubuntu 24.04, ARM, 24시간 상주)
 └─ Hermes Agent
     ├─ 모델: Gemini 2.5 Flash (OpenAI 호환 엔드포인트, 무료 쿼터)
     ├─ MCP: https://totaro-worktool.vercel.app/api/mcp (Bearer 토큰)
     │   → 회사 두뇌 읽기/쓰기 (기억·라벨·엔티티·태스크·감사로그)
     ├─ Gateway: Telegram 봇 (팀이 채팅으로 지시)
     └─ cron: 매일 08:00 KST 김사현 트렌드 다이제스트
```

## 사전 준비 (사용자)

1. **Oracle VM**: Ampere A1 (2 OCPU/12GB), Ubuntu 24.04, 홈 리전 Osaka/Tokyo.
   Public IP + SSH private key 확보.
2. **Gemini API 키**: https://aistudio.google.com/apikey
3. **MCP_BEARER_TOKEN**: Vercel → totaro-worktool → env 에 설정된 값.
4. **Telegram 봇 토큰**: @BotFather → /newbot (2분).

## 설치 (VM 에서)

```bash
# 1) 기본 패키지 + Hermes 설치 (Python 3.11·Node·ripgrep 자동)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# 2) 설정
mkdir -p ~/.hermes
# deploy/hermes/cli-config.yaml.example 내용을 ~/.hermes/config.yaml 로 복사하고
# <GEMINI_API_KEY> / <MCP_BEARER_TOKEN> 채우기

# 3) 연결 테스트
hermes   # TUI 진입 → "label_list 도구로 axis 라벨 보여줘" → 8축이 나오면 MCP 연결 OK
```

## 상주화 (systemd)

```ini
# /etc/systemd/system/hermes-gateway.service
[Unit]
Description=Hermes Agent Gateway (Telegram)
After=network-online.target

[Service]
Type=simple
User=ubuntu
ExecStart=/home/ubuntu/.local/bin/hermes gateway
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now hermes-gateway
```

## 김사현 일일 출근 (cron)

```bash
# crontab -e  (KST 08:00 = UTC 23:00 전날)
0 23 * * * /home/ubuntu/.local/bin/hermes run --profile kim-sahyun \
  "오늘의 PoC(건강식품)·E커머스 콘텐츠 트렌드를 조사해서 5줄 다이제스트 + 콘텐츠 소재 3개를 Telegram 으로 보고. 재사용 가치 있는 발견은 memory_write, 새 업체/제품은 entity_link 로 기록." \
  >> /home/ubuntu/hermes-cron.log 2>&1
```

(`hermes run`/cron 모듈의 정확한 CLI 형식은 설치된 버전의 `hermes --help` / cron/ 디렉토리 참조 —
Hermes 자체 cronjob_tools 가 있어 게이트웨이 안에서 등록하는 방식도 가능.)

## 에이전트 행동 원칙 (시스템 프롬프트에 포함)

1. MCP 도구 호출 시 `agent` 파라미터는 본인 slug (kim-sahyun / choi-jian / sim-jaehak).
2. 알게 된 사실은 `memory_write` (출처·신뢰도 포함). 다음 날 본인+동료가 재사용.
3. 분류는 `label_list` 로 통제 어휘 확인 후 `label_attach`. 자유 라벨 금지.
4. 새 거래처·제품·지원사업은 `entity_link`. 같은 이름 재등록 무해(멱등).
5. 모든 행동은 `agent_actions` 에 자동 기록됨 — 사람이 `/hub` 에서 검토.

## 검증 체크리스트

- [ ] `hermes` TUI 에서 Gemini 응답 옴 (모델 연결)
- [ ] "label_list 해봐" → 8축 라벨 출력 (MCP 연결)
- [ ] "memory_write 로 테스트 기억 저장해봐 (agent: kim-sahyun)" → 저장 id 반환
- [ ] Supabase `agent_actions` 에 행동 기록 확인
- [ ] Telegram 봇에 말 걸면 응답
- [ ] cron 다음 날 08:00 다이제스트 수신
