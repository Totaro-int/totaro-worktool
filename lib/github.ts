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
