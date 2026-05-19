import { PageHeader } from '@/components/ui'
import { getGithubData } from '@/lib/github'
import type { GithubData } from '@/lib/github'

export default async function GithubHubPage(): Promise<React.JSX.Element> {
  const data = await getGithubData()

  return (
    <>
      <PageHeader
        title="GitHub · 개발 업무"
        description="플랫폼 개발 작업 현황을 GitHub에서 실시간으로 확인합니다."
      />
      <div className="p-8">
        <div className="mx-auto max-w-4xl space-y-5">
          {data.status === 'unconfigured' && <SetupCard />}
          {data.status === 'error' && <ErrorCard message={data.message} />}
          {data.status === 'ok' && <GithubDashboard data={data} />}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}

function GithubDashboard({ data }: { data: GithubData }): React.JSX.Element {
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
        <span className="text-sm text-emerald-700">
          ✓ 실시간 연동됨 · <span className="font-semibold">{data.repo}</span>
        </span>
        <a
          href={data.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
        >
          저장소 열기 →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="오늘 커밋" value={data.commitsToday} />
        <StatCard label="열린 PR" value={data.openPullCount} />
        <StatCard label="열린 이슈" value={data.openIssueCount} />
      </div>

      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          최근 커밋 <span className="font-normal text-slate-400">· {data.defaultBranch}</span>
        </h2>
        {data.recentCommits.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">표시할 커밋이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.recentCommits.map((c) => (
              <li key={c.sha} className="flex items-center gap-3 py-2.5">
                <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                  {c.sha}
                </code>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-slate-700 transition-colors hover:text-indigo-600 hover:underline"
                >
                  {c.message}
                </a>
                <span className="shrink-0 text-xs text-slate-400">{c.author}</span>
                <span className="shrink-0 text-xs text-slate-300">{c.relativeTime}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">열린 PR</h2>
        {data.openPulls.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">열린 PR이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.openPulls.map((p) => (
              <li key={p.number} className="flex items-center gap-3 py-2.5">
                <span className="shrink-0 font-mono text-xs text-slate-400">#{p.number}</span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-slate-700 transition-colors hover:text-indigo-600 hover:underline"
                >
                  {p.title}
                </a>
                <span className="shrink-0 text-xs text-slate-400">{p.author}</span>
                <span className="shrink-0 text-xs text-slate-300">{p.relativeTime}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function ErrorCard({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-red-50 p-5 ring-1 ring-red-200">
      <h2 className="text-sm font-semibold text-red-800">GitHub 데이터를 불러오지 못했습니다</h2>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      <p className="mt-3 text-xs text-red-400">
        .env.local 값을 수정했다면 개발 서버를 재시작한 뒤 다시 확인하세요.
      </p>
    </div>
  )
}

function SetupCard(): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">GitHub 연동 설정이 필요합니다</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        프로젝트 루트의{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
          .env.local
        </code>{' '}
        파일에 아래 두 값을 입력한 뒤 개발 서버를 재시작하세요.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200">
        <code>{`GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=owner/repo`}</code>
      </pre>
      <ol className="mt-4 space-y-1.5 text-sm text-slate-600">
        <li>
          <span className="font-medium text-slate-700">1.</span> GitHub → Settings → Developer
          settings → Personal access tokens 에서 토큰 발급
        </li>
        <li>
          <span className="font-medium text-slate-700">2.</span> 비공개 저장소이므로 classic 토큰의{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
            repo
          </code>{' '}
          스코프 (또는 fine-grained 토큰에 Contents·Pull requests·Issues 읽기 권한) 를 부여
        </li>
        <li>
          <span className="font-medium text-slate-700">3.</span> 토큰과{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
            owner/repo
          </code>{' '}
          형식의 저장소 이름을 .env.local 에 입력
        </li>
      </ol>
    </div>
  )
}
