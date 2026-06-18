# 에이전트를 GCP 크레딧(Vertex)으로 돌리기

> ✅ **구현 완료 2026-06-18.** 에이전트 3명 전부 **litellm 프록시**(systemd `litellm-proxy`, :4000) → **Vertex AI**(`vertex_ai/gemini-2.5-flash`, project `totaro-mailroom-gmail`, us-central1, SA `~/.hermes/vertex-sa.json`)로 전환. 크레딧(결제계정 018F38)으로 과금. `config.yaml` base_url + cron 잡 3개 `provider: custom`. 백업 `*.bak-vertex`. 김사현 15:00 실행 검증(200 OK ×18, status ok). 모델만 바꾸면 Pro/Claude로 업그레이드 가능(크레딧 커버). 롤백: `*.bak-vertex` 복원 + `systemctl restart hermes-gateway`.
>
> 아래는 조사/선택지 히스토리 (참고용).

## (히스토리) 조사 결과 + 선택지

> 2026-06-17 밤 조사. **결론: Hermes엔 "Vertex로 Gemini" provider가 없다.** SA키를 만들어도 꽂을 곳이 없음.
> 에이전트 3명은 지금 AI Studio로 잘 돈다(오늘 3명 다 정상 실행 확인). **건드리지 않았음.**

---

## TL;DR

크레딧(web-totaro, ₩4.6M, Vertex 커버)을 에이전트에 쓰려면 **VM에 프록시/토큰 리프레셔**가 필요하다.
이건 주간·유인 작업이지, 야간 무인 작업이 아니다(프록시가 흔들리면 07~08시 보고가 깨짐).
**에이전트만 보면 실익이 거의 없다**(월 ₩1,177 = 연 ~₩14k). 크레딧의 가치는 고볼륨 Vertex 사용에 있음.

## 확인된 사실 (코드·문서 4중 확인)

1. `plugins/model-providers/` 에 `vertex`/`google-vertex` 디렉토리 **없음**. (gemini·anthropic·bedrock·openai·openrouter·xai 등만 존재)
2. 코드 전체에 `aiplatform.googleapis.com`·`publishers/google`(=Vertex Gemini 엔드포인트) 참조 **0건**.
3. 공식 문서 기준 Gemini 경로는 둘뿐:
   - `gemini` — AI Studio API키. (지금 이거. 크레딧 **커버 X**)
   - `google-gemini-cli` — Cloud Code Assist OAuth. 문서가 _"Google이 서드파티의 Gemini CLI OAuth 사용을 정책 위반으로 볼 수 있다"_ 경고. 프로덕션 비권장.
   - 코드 속 `vertex`/`anthropic-vertex` 문자열 = 이미지 입력 가능 여부 판별 힌트 / Claude-on-Vertex용. Gemini 챗 백엔드 아님.
4. 현재 VM `~/.hermes/config.yaml`:
   ```
   model:
     provider: custom
     base_url: https://generativelanguage.googleapis.com/v1beta/openai   # = AI Studio OpenAI호환
     model: gemini-2.5-flash
   ```
   cron 잡은 `provider: gemini` 로 오버라이드.

## 왜 "단순 전환"이 안 되나

Vertex AI에도 OpenAI 호환 엔드포인트가 있어서 `base_url`만 바꾸면 될 것 같지만 —
Vertex 인증은 **1시간마다 만료되는 액세스 토큰**이다. config의 static `api_key`로는 ~60분 뒤 401.
→ 토큰 자동 갱신이 필요 = 프록시(litellm) 또는 리프레셔 cron.

## 선택지

### A) AI Studio 유지 (추천 · 현상유지)

- 비용 월 ₩1,177. billing 이미 켜져 있어 429 없음. 작동 검증됨.
- 에이전트만 보면 마이그레이션 수고 > 절감액.

### B) litellm 프록시로 Vertex/크레딧 사용 — 정확한 runbook (크레딧을 정말 쓰고 싶을 때)

VM에 litellm 프록시 = Vertex 인증·토큰 갱신을 내부 처리하고 localhost 에 OpenAI 호환 노출.
**에이전트는 5번 테스트 통과 후에만 전환** → 실패 시 백업으로 5분 안에 롤백.

**1단계 — SA키 발급 (사장님이 직접. 고권한 키라 이 한 단계만 본인 손으로).** gcloud 있으면:

```bash
gcloud config set project web-totaro          # 실제 프로젝트 ID 확인
gcloud services enable aiplatform.googleapis.com
gcloud iam service-accounts create hermes-vertex --display-name="Hermes Vertex"
gcloud projects add-iam-policy-binding web-totaro \
  --member="serviceAccount:hermes-vertex@web-totaro.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
gcloud iam service-accounts keys create ~/vertex-sa.json \
  --iam-account=hermes-vertex@web-totaro.iam.gserviceaccount.com
scp -i ~/Downloads/hermes-vm.key ~/vertex-sa.json \
  ubuntu@158.101.71.23:~/.hermes/vertex-sa.json
```

콘솔이면: console.cloud.google.com → web-totaro → IAM·관리자 → 서비스 계정 → 만들기 →
역할 **Vertex AI 사용자** → 키 → 키 추가 → JSON 다운로드 → 위 scp 로 VM 업로드.

**2~6단계 — VM 작업 (다음 세션에 클로드가 대신 해도 됨):**

```bash
ssh -i ~/Downloads/hermes-vm.key ubuntu@158.101.71.23

# 2) 격리 venv 에 litellm (Hermes venv 안 건드림)
python3 -m venv ~/litellm-venv && ~/litellm-venv/bin/pip install 'litellm[proxy]'

# 3) litellm config
cat > ~/litellm-config.yaml <<'YAML'
model_list:
  - model_name: gemini-2.5-flash
    litellm_params:
      model: vertex_ai/gemini-2.5-flash
      vertex_project: web-totaro
      vertex_location: us-central1          # gemini-2.5-flash 가용 리전 확인
      vertex_credentials: /home/ubuntu/.hermes/vertex-sa.json
YAML

# 4) 프록시 기동 (확인용)
~/litellm-venv/bin/litellm --config ~/litellm-config.yaml --port 4000 &

# 5) 테스트 — Vertex 로 응답 오나
curl -s http://localhost:4000/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"한국어로 핑"}]}'

# 6) 통과 시 Hermes 전환 (먼저 백업!)
cp ~/.hermes/config.yaml ~/.hermes/config.yaml.bak
#   config.yaml: model.base_url → http://localhost:4000/v1
#   cron/jobs.json: 3개 잡 provider "gemini" → "custom" (안 그러면 AI Studio 로 샘)
sudo systemctl restart hermes-gateway
hermes cron run e7296e8c5c04                  # 김사현 실전 테스트 (~90초 후 output 확인)

# 롤백: cp ~/.hermes/config.yaml.bak ~/.hermes/config.yaml && sudo systemctl restart hermes-gateway
```

프록시도 통과 후 systemd 서비스로 등록(부팅 자동 기동). → 주간·유인, 약 1시간. 무인 야간 X.

## 먼저 확인할 것 (크레딧 실효성)

- web-totaro 크레딧이 실제로 Vertex 사용을 커버하는지 + 워크툴이 쓰는 **`totaro-mailroom-gmail`** 프로젝트가 같은 결제계정/크레딧인지.
- `console.cloud.google.com/billing` → 결제계정 `018F38-C0D039-8C8D4E` → 연결된 프로젝트 확인.

## 진짜 판단

크레딧 ₩4.6M의 가치는 3개 cron 에이전트(월 ₩1,177)가 아니라 **고볼륨 Vertex 사용**에 있다
(워크툴 AI 챗 · 김사현 Apify 분석을 키울 때). "우리 Gemini 전부를 web-totaro/Vertex로 모아 크레딧 소진"은
별도 프로젝트(주간·유인)로 다룰 일. 에이전트만 옮기는 건 실익이 적다.
