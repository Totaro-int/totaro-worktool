import { PageHeader } from '@/components/ui'

type Stat = { label: string; value: string }

export function NodeDashboard({
  title,
  description,
  banner,
  stats,
  listTitle,
  listItems,
}: {
  title: string
  description: string
  banner: string
  stats: Stat[]
  listTitle: string
  listItems: string[]
}): React.JSX.Element {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="p-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
            {banner}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">{listTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {listItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
