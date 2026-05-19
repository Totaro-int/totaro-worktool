import { AreaTaskList } from '@/components/AreaTaskList'
import { ConsolePanel, ConsoleShell, StatPanel } from '@/components/console'
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
      <ConsoleShell>
        <AreaTaskList workAreaId="b2b_sourcing" />
        {data.status === 'unconfigured' && <SetupCard />}
        {data.status === 'error' && <ErrorCard message={data.message} />}
        {data.status === 'ok' && <GithubDashboard data={data} />}
      </ConsoleShell>
    </>
  )
}

function GithubDashboard({ data }: { data: GithubData }): React.JSX.Element {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[10px] tracking-[0.14em] text-slate-400">
            GITHUB ONLINE · {data.repo}
          </span>
        </div>
        <a
          href={data.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] tracking-wide text-blue-500 hover:text-blue-600"
        >
          저장소 열기 →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPanel label="오늘 커밋" value={String(data.commitsToday)} accent="blue" />
        <StatPanel label="열린 PR" value={String(data.openPullCount)} accent="slate" />
        <StatPanel label="열린 이슈" value={String(data.openIssueCount)} accent="amber" />
      </div>

      <ConsolePanel title="최근 커밋" meta={data.defaultBranch} accent="blue" flush>
        {data.recentCommits.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">표시할 커밋이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentCommits.map((c) => (
              <li key={c.sha} className="flex items-center gap-3 px-5 py-2.5">
                <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                  {c.sha}
                </code>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-slate-700 transition-colors hover:text-blue-600 hover:underline"
                >
                  {c.message}
                </a>
                <span className="shrink-0 text-xs text-slate-400">{c.author}</span>
                <span className="shrink-0 text-xs text-slate-300">{c.relativeTime}</span>
              </li>
            ))}
          </ul>
        )}
      </ConsolePanel>

      <ConsolePanel title="열린 PR" accent="slate" flush>
        {data.openPulls.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">열린 PR이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.openPulls.map((p) => (
              <li key={p.number} className="flex items-center gap-3 px-5 py-2.5">
                <span className="shrink-0 font-mono text-xs text-slate-400">#{p.number}</span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-slate-700 transition-colors hover:text-blue-600 hover:underline"
                >
                  {p.title}
                </a>
                <span className="shrink-0 text-xs text-slate-400">{p.author}</span>
                <span className="shrink-0 text-xs text-slate-300">{p.relativeTime}</span>
              </li>
            ))}
          </ul>
        )}
      </ConsolePanel>
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
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
