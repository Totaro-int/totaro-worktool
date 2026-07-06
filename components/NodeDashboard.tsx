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
              <div key={stat.label} className="rounded-xl bg-[#101f38] p-4 ring-1 ring-[#1c3556]">
                <p className="text-xs text-[#6b7c96]">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#dbe7f4]">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[#101f38] p-5 ring-1 ring-[#1c3556]">
            <h2 className="text-sm font-semibold text-[#c4d2e4]">{listTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#9fb4d0]">
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
