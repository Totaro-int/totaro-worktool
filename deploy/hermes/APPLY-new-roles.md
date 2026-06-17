# 적용 가이드 — 에이전트 3명 새 역할 + Apify (2026-06-17)

전략 재정립(소싱 컷 · 브랜딩 집중 · 7/31 전환 북극성)에 맞춰 VM의 3 에이전트를 재배치한다.
**VM SSH 접근이 되는 사람**이 아래를 실행. 약 5분. (토큰만 본인이 입력)

## 0. 선행 — Apify 토큰

apify.com 무료 가입 → Console → **Settings → Integrations → Personal API token** 복사.

## 1. VM 접속

```bash
ssh ubuntu@158.101.71.23      # 또는 평소 접속 방식
```

## 2. config.yaml 에 Apify MCP 추가

`~/.hermes/config.yaml` 의 `mcp_servers:` 아래에 추가 (totaro 블록과 형제로):

```yaml
apify:
  url: 'https://mcp.apify.com'
  headers:
    Authorization: 'Bearer <APIFY_TOKEN>' # ← 0번에서 복사한 토큰
  timeout: 180
```

## 3. 3 에이전트 cron 프롬프트 교체

각 프롬프트 **전문**은 이 폴더의 문서 안 ```블록에 있다:
| 에이전트 | job id | 새 프롬프트 출처 | 시각 |
|---|---|---|---|
| 김사현 |`e7296e8c5c04`|`kim-sahyun.md`「일일 마케팅 분석 지시」 | 08:00 |
| 최지안 |`bd87c4861b71`|`choi-jian.md`「일일 자사몰 QA 지시」 | 07:00 |
| 심재학 |`ee7b321aa15a`|`sim-jaehak.md` 「일일 고객·시장 지시」 | 07:30 |

`~/.hermes/cron/jobs.json` 에서 각 잡의 `prompt` 를 위 내용으로 교체.

- 각 잡의 `provider:"gemini"`, `model:"gemini-2.5-flash"` **유지**(이거 없으면 cron이 모델 못 찾아 실패).
- 편집 전 백업: `cp ~/.hermes/cron/jobs.json ~/.hermes/cron/jobs.json.bak`

## 4. 게이트웨이 재시작

```bash
sudo systemctl restart hermes-gateway
```

## 5. 테스트 (김사현 = Apify 연결 확인)

```bash
hermes cron run e7296e8c5c04
# hermes cron run 은 다음 60초 스케줄러 틱에 큐잉됨(즉시 X). ~90초 후:
ls -t ~/.hermes/cron/output/e7296e8c5c04/ | head
cat ~/.hermes/cron/output/e7296e8c5c04/$(ls -t ~/.hermes/cron/output/e7296e8c5c04/ | head -1)
tail -40 ~/.hermes/agent.log    # Apify 액터 호출(search-actors/call-actor) 보이면 성공
```

Apify 미연결이면 김사현은 일반 웹서치로 폴백하고 "Apify 미연결"을 보고에 적는다.

---

## 참고 — 왜 클로드가 직접 못 했나

이 적용은 (1) VM SSH 접근, (2) Apify 토큰 입력 두 가지가 필요하다.
토큰 입력은 보안상 사람이 직접. SSH 키는 로컬 ~/.ssh 에 없고 에이전트도 비대화형 셸에서
안 잡혀 클로드가 접속 불가였다. → VM 키를 가진 사람이 위를 실행.
