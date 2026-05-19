import { timeAgo } from '@/lib/format'

const GITHUB_API = 'https://api.github.com'
const REVALIDATE_SECONDS = 300

type RawRepo = {
  full_name: string
  description: string | null
  default_branch: string
  open_issues_count: number
  html_url: string
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

type RawPull = {
  number: number
  title: string
  html_url: string
  created_at: string
  user: { login: string } | null
}

export type GithubCommit = {
  sha: string
  message: string
  author: string
  relativeTime: string
  url: string
}

export type GithubPull = {
  number: number
  title: string
  author: string
  relativeTime: string
  url: string
}

export type GithubData = {
  status: 'ok'
  repo: string
  repoUrl: string
  description: string | null
  defaultBranch: string
  commitsToday: number
  openPullCount: number
  openIssueCount: number
  recentCommits: GithubCommit[]
  openPulls: GithubPull[]
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
    if (res.status === 404) {
      throw new Error(
        '저장소를 찾을 수 없습니다 (404). GITHUB_REPO 값(owner/repo)과 토큰 권한을 확인하세요.'
      )
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

/** /hub/github 대시보드용 GitHub 저장소 현황을 조회한다. */
export async function getGithubData(): Promise<GithubResult> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) return { status: 'unconfigured' }

  try {
    const [repoInfo, commits, pulls] = await Promise.all([
      ghFetch<RawRepo>(token, `/repos/${repo}`),
      ghFetch<RawCommit[]>(token, `/repos/${repo}/commits?per_page=30`),
      ghFetch<RawPull[]>(token, `/repos/${repo}/pulls?state=open&per_page=50`),
    ])

    const today = seoulDate()
    const commitsToday = commits.filter(
      (c) => c.commit.author && seoulDate(c.commit.author.date) === today
    ).length

    const recentCommits: GithubCommit[] = commits.slice(0, 8).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.author?.login ?? c.commit.author?.name ?? '알 수 없음',
      relativeTime: c.commit.author ? timeAgo(c.commit.author.date) : '',
      url: c.html_url,
    }))

    const openPulls: GithubPull[] = pulls.map((p) => ({
      number: p.number,
      title: p.title,
      author: p.user?.login ?? '알 수 없음',
      relativeTime: timeAgo(p.created_at),
      url: p.html_url,
    }))

    return {
      status: 'ok',
      repo: repoInfo.full_name,
      repoUrl: repoInfo.html_url,
      description: repoInfo.description,
      defaultBranch: repoInfo.default_branch,
      commitsToday,
      openPullCount: openPulls.length,
      openIssueCount: Math.max(0, repoInfo.open_issues_count - openPulls.length),
      recentCommits,
      openPulls: openPulls.slice(0, 6),
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}
