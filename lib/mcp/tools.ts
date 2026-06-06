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
      '토타로 내부 파일 시스템에서 문서 검색 (파일명·설명·AI 요약·문서종류·폴더경로 부분일치). 출처(Gmail·카톡·웹 업로드) 무관 모든 파일 통합 검색. axis 로 7-axis 영역 필터링 가능 (예: "03 공급사" → 공급사 폴더만).',
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
      '문서를 "뜻"으로 검색 (임베딩 기반). mailroom_search 의 부분일치보다 똑똑함. 자연어 질문으로 의미상 가까운 문서를 찾음. 글자가 안 맞아도 OK. 예: "정부 지원사업 자료" 라고 치면 "예비창업패키지", "창업도약패키지" 등 의미상 매칭되는 것도 잡힘.',
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
      '문서 본문 텍스트 추출 (PDF·docx·txt·md 등). Drive 에서 실제 파일 다운로드 후 텍스트 추출 (최대 8000자). file_id 는 search 결과에 나옴.',
    inputSchema: {
      type: 'object',
      required: ['file_id'],
      properties: { file_id: { type: 'string', description: 'Supabase 문서 id (UUID)' } },
    },
  },
  {
    name: 'mailroom_list',
    description: '폴더 안 파일 목록. 폴더 경로 부분일치.',
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
