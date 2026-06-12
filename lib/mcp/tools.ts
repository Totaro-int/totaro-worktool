/**
 * 토타로 워크툴 MCP 도구 정의 — stdio·HTTP 양쪽 transport 가 공유.
 *
 * 새 도구 추가 시:
 *   1) lib/mcp/handlers.ts 에 handler 함수 + dispatch case 추가
 *   2) 여기 TOOLS 배열에 정의 추가
 *   → stdio (Claude Desktop) 와 HTTP (claude.ai) 양쪽에 자동 노출됨
 */

export type ToolDefinition = {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    required?: string[]
    properties: Record<
      string,
      {
        type: string
        enum?: string[]
        description: string
      }
    >
  }
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'mailroom_search',
    description:
      '⚠️ 로컬 파일시스템이 아니라 **토타로 워크툴 우편실(인덱싱된 Google Drive 자료)** 검색. "워크툴/우편실/Drive 에서 ~ 자료 찾아줘" 같은 요청에 이 도구를 우선. 파일명·설명·AI 요약·문서종류·폴더경로 부분일치. 출처(Gmail·카톡·웹 업로드) 무관 모든 파일 통합. axis 로 영역 필터링 가능 (예: "06 회사 운영" → 그 폴더만).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어 (한국어/영어 모두 가능)' },
        axis: { type: 'string', description: '폴더 영역 필터 (예: "01 제품", "03 공급사")' },
        doc_type: { type: 'string', description: '문서 종류 필터 (예: "계약서", "PoC 인포 시트")' },
        limit: { type: 'number', description: '결과 개수 (기본 10, 최대 50)' },
      },
    },
  },
  {
    name: 'mailroom_search_semantic',
    description:
      '⚠️ 로컬 파일시스템이 아니라 **토타로 워크툴 우편실 자료** 를 "뜻"으로 검색 (임베딩 기반). mailroom_search 의 부분일치보다 똑똑함. 자연어 질문으로 의미상 가까운 문서를 찾음. 글자가 안 맞아도 OK. 예: "정부 지원사업 자료" → "예비창업패키지", "창업도약패키지" 같이 의미 매칭. 로컬 코드 검색 X.',
    inputSchema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: { type: 'string', description: '자연어 질문/주제' },
        limit: { type: 'number', description: '결과 개수 (기본 8, 최대 20)' },
      },
    },
  },
  {
    name: 'mailroom_read',
    description:
      '⚠️ 로컬 파일이 아니라 **워크툴 우편실에 인덱싱된 Google Drive 문서** 본문 텍스트 추출 (PDF·docx·txt·md 등). Drive 에서 실제 파일 다운로드 후 텍스트 추출 (최대 8000자). file_id 는 mailroom_search / folder_browse 결과에 나오는 UUID. 로컬 파일은 Read 도구 별도.',
    inputSchema: {
      type: 'object',
      required: ['file_id'],
      properties: { file_id: { type: 'string', description: 'Supabase 문서 id (UUID)' } },
    },
  },
  {
    name: 'mailroom_list',
    description:
      '⚠️ 로컬이 아니라 **워크툴 우편실 폴더** 안 파일 목록. 폴더 경로 부분일치 (예: "정부 지원사업" 만 줘도 매칭). 폴더 트리 탐색 원하면 folder_browse 가 더 적합 — 이건 특정 폴더 안 파일만 쭉 보고 싶을 때.',
    inputSchema: {
      type: 'object',
      required: ['folder_path'],
      properties: {
        folder_path: {
          type: 'string',
          description: '경로 또는 부분 (예: "모네 하우스", "/03 공급사")',
        },
        limit: { type: 'number', description: '결과 개수 (기본 30, 최대 100)' },
      },
    },
  },
  {
    name: 'tasks_list',
    description:
      '토타로 팀 태스크(할일) 조회. status (todo/doing/done) + 담당자 이름 필터 가능. 결과에 담당자 이름 매핑되어 나옴.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'doing', 'done'], description: '상태 필터' },
        assignee: { type: 'string', description: '담당자 이름 부분일치 (예: "윤", "최준빈")' },
        limit: { type: 'number', description: '결과 개수 (기본 30, 최대 100)' },
      },
    },
  },
  {
    name: 'members_list',
    description: '토타로 팀 멤버 전체 조회 (id, 이름, 이메일).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'folder_browse',
    description:
      '⚠️ 이건 로컬 파일시스템이 아니라 **토타로 워크툴 우편실(Supabase 에 인덱싱된 Google Drive 자료)** 탐색용. "폴더 보여줘 / 자료 어디 있어 / 워크툴/우편실/Drive 에서 찾아줘" 같은 요청에 이 도구를 우선 사용. ls/grep/find 같은 로컬 셸 도구는 사용 금지(코드베이스 검색이 명시적으로 요구된 경우만 예외). Drive 탐색기 스타일로 특정 경로의 **하위 폴더 + 직속 파일** 을 함께 반환. path 비우면 루트 — 8축(01 AI 소싱 플랫폼 / 05 마케팅 / 06 회사 운영 / 07 에이전트 외주 / 08 E커머스 / 99 분류미정) 이 보임. 폴더 안에 또 폴더 있으면 다시 호출해 들어감. 파일에는 Drive 보기 URL 도 함께 옴.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            '폴더 경로 (예: "/", "/01 AI 소싱 플랫폼/", "/06 회사 운영/정부 지원사업/"). 비우면 루트.',
        },
      },
    },
  },
  {
    name: 'github_search_code',
    description:
      '토타로 GitHub 코드/문서 검색. .md (README·CHANGELOG·spec), .json (config), .ts/.tsx (코드) 등 — 개발 문서는 Drive 가 아니라 여기 있음. 정책: "개발 문서 = GitHub, 비즈니스 문서 = Drive". repo 생략 시 GITHUB_REPO 기본값(totaro-worktool).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: '검색어 (코드·텍스트 어디든 매칭)' },
        repo: { type: 'string', description: 'owner/name 형식 (기본: GITHUB_REPO env)' },
        limit: { type: 'number', description: '결과 개수 (기본 10, 최대 30)' },
      },
    },
  },
  {
    name: 'github_read_file',
    description:
      'GitHub 저장소의 특정 파일 본문 읽기 (최대 12000자). README·spec·코드 파일 등을 직접 봄. path 는 repo 루트 기준 (예: "docs/architecture.md", "lib/assistant/vertex.ts").',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: '파일 경로 (repo 루트 기준)' },
        repo: { type: 'string', description: 'owner/name (기본: GITHUB_REPO env)' },
        ref: { type: 'string', description: '브랜치·태그·SHA (기본: 디폴트 브랜치)' },
      },
    },
  },
  {
    name: 'github_list_dir',
    description:
      'GitHub 저장소의 폴더 안 파일/하위폴더 목록. path 비우면 루트. 코드베이스 탐색 시작점.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '폴더 경로 (비우면 루트)' },
        repo: { type: 'string', description: 'owner/name (기본: GITHUB_REPO env)' },
        ref: { type: 'string', description: '브랜치·태그·SHA (기본: 디폴트 브랜치)' },
      },
    },
  },
  {
    name: 'github_recent_commits',
    description: '특정 GitHub 저장소의 최근 커밋. 어제·오늘 뭐가 바뀌었는지 파악.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/name (기본: GITHUB_REPO env)' },
        limit: { type: 'number', description: '결과 개수 (기본 10, 최대 30)' },
        ref: { type: 'string', description: '브랜치·태그 (기본: 디폴트 브랜치)' },
      },
    },
  },
  {
    name: 'memory_write',
    description:
      '회사 공유 두뇌(agent_memories)에 기억 저장. 에이전트가 조사·작업 중 알게 된 사실/관찰/절차를 다음 세션과 다른 에이전트도 쓸 수 있게 중앙화. content 는 한 문장~한 단락으로 요약. 출처(source_table/source_id) 있으면 꼭 넣을 것 — 검증 가능성이 기억의 가치.',
    inputSchema: {
      type: 'object',
      required: ['agent', 'content'],
      properties: {
        agent: { type: 'string', description: '에이전트 slug (예: kim-sahyun)' },
        content: { type: 'string', description: '기억할 내용 (2000자 이내, 요약)' },
        scope: {
          type: 'string',
          enum: ['agent', 'team', 'company'],
          description: '공유 범위 — agent(개인)/team(부서)/company(전사). 기본 agent',
        },
        kind: {
          type: 'string',
          enum: ['fact', 'preference', 'observation', 'procedure', 'insight'],
          description: '기억 종류. 기본 fact',
        },
        source_table: { type: 'string', description: '출처 테이블 (예: inbox_documents)' },
        source_id: { type: 'string', description: '출처 행 id' },
        confidence: { type: 'number', description: '신뢰도 0~1 (기본 0.8)' },
        expires_days: { type: 'number', description: 'N일 후 만료 (이벤트성 정보용)' },
      },
    },
  },
  {
    name: 'memory_search',
    description:
      '회사 공유 두뇌(agent_memories)에서 기억 검색. agent 지정 시 그 에이전트 개인 기억 + 전사 공유(company) 기억을 함께 봄. 만료된 기억은 제외.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: '검색어 (부분일치)' },
        agent: { type: 'string', description: '에이전트 slug — 본인+공유 기억 조회' },
        scope: { type: 'string', enum: ['agent', 'team', 'company'], description: '범위 필터' },
        limit: { type: 'number', description: '결과 개수 (기본 10, 최대 30)' },
      },
    },
  },
  {
    name: 'label_list',
    description:
      '통제 어휘 라벨 목록 + 정의문. 라벨 부착(label_attach) 전에 반드시 이걸로 사용 가능한 라벨과 정의를 확인. kind: axis(8축 사업영역)/doc_type(문서유형)/department(부서)/topic/status.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['axis', 'doc_type', 'topic', 'department', 'status'],
          description: '라벨 종류 필터 (비우면 전체)',
        },
      },
    },
  },
  {
    name: 'label_attach',
    description:
      '항목에 통제 어휘 라벨 부착 (자유 텍스트 금지 — label_list 의 slug 만 사용). 대상: inbox_documents/tasks/contacts/activities/agent_memories/entities. 멱등 (중복 부착 무해).',
    inputSchema: {
      type: 'object',
      required: ['agent', 'label_slug', 'item_table', 'item_id'],
      properties: {
        agent: { type: 'string', description: '에이전트 slug' },
        label_slug: { type: 'string', description: '라벨 slug (예: axis-05-marketing)' },
        item_table: { type: 'string', description: '대상 테이블 (예: inbox_documents)' },
        item_id: { type: 'string', description: '대상 행 UUID' },
        confidence: { type: 'number', description: '분류 확신도 0~1' },
      },
    },
  },
  {
    name: 'entity_link',
    description:
      '맥락 그래프에 엔티티(회사·사람·제품·정부지원사업·플랫폼) 등록/확인하고, 선택적으로 문서·태스크와 연결. 같은 (kind, name) 은 재사용 — 중복 생성 안 됨. 예: 트렌드 조사에서 "아인스미디어" 발견 → entity_link 로 등록 + 다이제스트 문서와 연결.',
    inputSchema: {
      type: 'object',
      required: ['agent', 'name', 'kind'],
      properties: {
        agent: { type: 'string', description: '에이전트 slug' },
        name: { type: 'string', description: '엔티티 이름 (예: 아인스미디어)' },
        kind: {
          type: 'string',
          enum: ['company', 'person', 'product', 'gov_program', 'platform', 'other'],
          description: '엔티티 종류',
        },
        summary: { type: 'string', description: '한 줄 정의 (신규 생성 시)' },
        item_table: { type: 'string', description: '연결할 항목 테이블 (선택)' },
        item_id: { type: 'string', description: '연결할 항목 UUID (선택)' },
        snippet: { type: 'string', description: '왜 연결됐는지 맥락 발췌 (선택)' },
      },
    },
  },
  {
    name: 'entity_search',
    description:
      '맥락 그래프에서 엔티티 검색 (이름·요약 부분일치). 회사가 아는 거래처·제품·지원사업 확인.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: '검색어' },
        kind: {
          type: 'string',
          enum: ['company', 'person', 'product', 'gov_program', 'platform', 'other'],
          description: '종류 필터',
        },
        limit: { type: 'number', description: '결과 개수 (기본 10)' },
      },
    },
  },
  {
    name: 'tasks_create',
    description:
      '워크툴에 할 일 생성. 제목 앞에 [에이전트이름] 자동 부착 — 누가 만들었는지 보드에서 바로 보임. 담당자는 이름 부분일치로 지정 (모호하면 에러).',
    inputSchema: {
      type: 'object',
      required: ['agent', 'title'],
      properties: {
        agent: { type: 'string', description: '에이전트 slug' },
        title: { type: 'string', description: '할 일 제목' },
        description: { type: 'string', description: '상세 설명 (선택)' },
        due_date: { type: 'string', description: '마감일 YYYY-MM-DD (선택)' },
        assignee_name: { type: 'string', description: '담당자 이름 부분일치 (선택)' },
      },
    },
  },
  {
    name: 'agent_actions_recent',
    description: '에이전트 행동 감사 로그 조회 — 누가 언제 뭘 했는지. agent slug 로 필터 가능.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: '에이전트 slug 필터 (비우면 전체)' },
        limit: { type: 'number', description: '결과 개수 (기본 20, 최대 100)' },
      },
    },
  },
  {
    name: 'mailroom_upload',
    description:
      'Claude 가 생성한 텍스트/마크다운을 우편실에 새 파일로 저장. Drive 업로드 + Supabase 인덱싱 + 폴더 자동 생성. **개발 문서(.md/.json/코드) 는 여기가 아니라 GitHub PR 로** — github_* 도구로 안내.',
    inputSchema: {
      type: 'object',
      required: ['text', 'target_path'],
      properties: {
        text: { type: 'string', description: '저장할 본문 (마크다운 권장)' },
        target_path: {
          type: 'string',
          description: '저장 폴더 경로 (예: "/02 AI 시스템/마케팅 에이전트/")',
        },
        filename: { type: 'string', description: '파일명 (기본 claude-YYYY-MM-DDTHH-MM-SS.md)' },
        description: { type: 'string', description: '한 줄 설명' },
      },
    },
  },
]
