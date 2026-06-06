import { timeAgo } from '@/lib/format'

const GITHUB_API = 'https://api.github.com'
const REVALIDATE_SECONDS = 300
// 조직 커밋 피드를 만들 때 스캔할 (최근 푸시 순) 저장소 수
const SCAN_REPOS = 8

type RawRepo = {
  name: string
  full_name: string
  html_url: string
  pushed_at: string | null
  private: boolean
}

type RawCommit = {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name: string; date: string } | null
  }
  author: { login: string } | null
}

export type GithubCommit = {
  repo: string
  sha: string
  message: string
  author: string
  relativeTime: string
  url: string
}

export type GithubRepo = {
  name: string
  url: string
  pushedRelative: string
  private: boolean
}

export type GithubData = {
  status: 'ok'
  org: string
  orgUrl: string
  repoCount: number
  commitsToday: number
  recentCommits: GithubCommit[]
  repos: GithubRepo[]
}

export type GithubResult =
  | GithubData
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }

/** Asia/Seoul 기준 날짜 문자열(YYYY-MM-DD)을 반환한다. iso 미지정 시 현재 시각. */
function seoulDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

async function ghFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'totaro-worktool',
    },
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('GitHub 토큰이 유효하지 않습니다 (401). GITHUB_TOKEN 값을 확인하세요.')
    }
    if (res.status === 403) {
      throw new Error(
        'GitHub API 요청이 거부되었습니다 (403). 토큰 권한 또는 호출 한도를 확인하세요.'
      )
    }
    throw new Error(`GitHub API 오류가 발생했습니다 (${res.status}).`)
  }
  return res.json() as Promise<T>
}

/**
 * /hub/github 대시보드용 — GITHUB_REPO 의 조직(owner) 전체 개발 활동을 조회한다.
 * 최근 푸시된 저장소 상위 SCAN_REPOS 개의 커밋을 모아 하나의 피드로 합친다.
 */
export async function getGithubData(): Promise<GithubResult> {
  const token = process.env.GITHUB_TOKEN
  const repoEnv = process.env.GITHUB_REPO
  if (!token || !repoEnv) return { status: 'unconfigured' }
  const org = repoEnv.split('/')[0]

  try {
    const repos = await ghFetch<RawRepo[]>(
      token,
      `/orgs/${org}/repos?sort=pushed&direction=desc&per_page=100`
    )

    const scanned = await Promise.all(
      repos.slice(0, SCAN_REPOS).map(async (r) => {
        try {
          const commits = await ghFetch<RawCommit[]>(
            token,
            `/repos/${r.full_name}/commits?per_page=5`
          )
          return commits.map((c) => ({
            repo: r.name,
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split('\n')[0],
            author: c.author?.login ?? c.commit.author?.name ?? '알 수 없음',
            date: c.commit.author?.date ?? '',
            relativeTime: c.commit.author ? timeAgo(c.commit.author.date) : '',
            url: c.html_url,
          }))
        } catch {
          return []
        }
      })
    )
    const allCommits = scanned.flat().sort((a, b) => (a.date < b.date ? 1 : -1))

    const today = seoulDate()
    const commitsToday = allCommits.filter((c) => c.date && seoulDate(c.date) === today).length

    const recentCommits: GithubCommit[] = allCommits.slice(0, 20).map((c) => ({
      repo: c.repo,
      sha: c.sha,
      message: c.message,
      author: c.author,
      relativeTime: c.relativeTime,
      url: c.url,
    }))

    return {
      status: 'ok',
      org,
      orgUrl: `https://github.com/${org}`,
      repoCount: repos.length,
      commitsToday,
      recentCommits,
      repos: repos.slice(0, 12).map((r) => ({
        name: r.name,
        url: r.html_url,
        pushedRelative: r.pushed_at ? timeAgo(r.pushed_at) : '',
        private: r.private,
      })),
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MCP 용 헬퍼 — 코드/문서 검색·읽기·목록·커밋
// ─────────────────────────────────────────────────────────────

function ghAuth(): { token: string; defaultRepo: string } {
  const token = process.env.GITHUB_TOKEN
  const defaultRepo = process.env.GITHUB_REPO ?? ''
  if (!token) throw new Error('GITHUB_TOKEN 환경변수가 없습니다.')
  return { token, defaultRepo }
}

/** "owner/repo" 또는 입력 그대로 반환. 없으면 GITHUB_REPO 사용. */
function resolveRepo(repo: string | undefined, defaultRepo: string): string {
  const r = (repo ?? defaultRepo).trim()
  if (!r.includes('/')) throw new Error(`repo 형식 잘못됨 (owner/name 필요): "${r}"`)
  return r
}

export type GhSearchResult = {
  path: string
  repo: string
  url: string
  textMatches?: Array<{ fragment: string }>
}

/** 코드 검색 — GitHub Code Search API (org/repo 한정 가능). */
export async function ghSearchCode(
  query: string,
  repo?: string,
  limit = 10
): Promise<GhSearchResult[]> {
  const { token, defaultRepo } = ghAuth()
  const r = resolveRepo(repo, defaultRepo)
  const q = `${query} repo:${r}`
  const res = await fetch(
    `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 30)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.text-match+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'totaro-worktool',
      },
    }
  )
  if (!res.ok) throw new Error(`GitHub search ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    items?: Array<{
      path: string
      html_url: string
      repository: { full_name: string }
      text_matches?: Array<{ fragment: string }>
    }>
  }
  return (json.items ?? []).map((it) => ({
    path: it.path,
    repo: it.repository.full_name,
    url: it.html_url,
    textMatches: it.text_matches?.map((m) => ({ fragment: m.fragment })),
  }))
}

/** 파일 한 개 읽기 (텍스트). 큰 파일은 일부만. */
export async function ghReadFile(
  filePath: string,
  repo?: string,
  ref?: string
): Promise<{ path: string; repo: string; ref: string; size: number; content: string }> {
  const { token, defaultRepo } = ghAuth()
  const r = resolveRepo(repo, defaultRepo)
  const refQ = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const res = await fetch(`${GITHUB_API}/repos/${r}/contents/${encodeURI(filePath)}${refQ}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'totaro-worktool',
    },
  })
  if (!res.ok) throw new Error(`GitHub read ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    type: string
    name: string
    path: string
    size: number
    content?: string
    encoding?: string
    sha: string
  }
  if (json.type !== 'file') throw new Error(`경로가 파일이 아님: ${filePath} (type=${json.type})`)
  const content =
    json.encoding === 'base64' && json.content
      ? Buffer.from(json.content, 'base64').toString('utf-8')
      : (json.content ?? '')
  return { path: json.path, repo: r, ref: ref ?? 'HEAD', size: json.size, content }
}

export type GhDirEntry = {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  size: number
}

/** 폴더 안 목록. path 비우면 repo 루트. */
export async function ghListDir(
  dirPath: string,
  repo?: string,
  ref?: string
): Promise<GhDirEntry[]> {
  const { token, defaultRepo } = ghAuth()
  const r = resolveRepo(repo, defaultRepo)
  const refQ = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const p = dirPath ? encodeURI(dirPath) : ''
  const res = await fetch(`${GITHUB_API}/repos/${r}/contents/${p}${refQ}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'totaro-worktool',
    },
  })
  if (!res.ok) throw new Error(`GitHub list ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as
    | Array<{ type: GhDirEntry['type']; name: string; path: string; size: number }>
    | { message?: string }
  if (!Array.isArray(json)) throw new Error(`경로가 폴더가 아님: ${dirPath || '(루트)'}`)
  return json.map((e) => ({ type: e.type, name: e.name, path: e.path, size: e.size }))
}

/** 최근 커밋 — 특정 repo 의 메인 브랜치 기준 (또는 ref). */
export async function ghRecentCommits(
  repo?: string,
  limit = 10,
  ref?: string
): Promise<GithubCommit[]> {
  const { token, defaultRepo } = ghAuth()
  const r = resolveRepo(repo, defaultRepo)
  const sha = ref ? `&sha=${encodeURIComponent(ref)}` : ''
  const res = await fetch(
    `${GITHUB_API}/repos/${r}/commits?per_page=${Math.min(limit, 30)}${sha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'totaro-worktool',
      },
    }
  )
  if (!res.ok) throw new Error(`GitHub commits ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const items = (await res.json()) as RawCommit[]
  return items.map((c) => ({
    repo: r,
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.author?.login ?? c.commit.author?.name ?? '알 수 없음',
    relativeTime: c.commit.author ? timeAgo(c.commit.author.date) : '',
    url: c.html_url,
  }))
}
