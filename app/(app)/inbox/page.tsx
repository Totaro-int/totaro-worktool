import { createClient } from '@/lib/supabase/server'

import { InboxClient } from './InboxClient'

export const dynamic = 'force-dynamic'

export default async function InboxPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const { data: members } = await supabase.from('members').select('id, name').order('name')
  const memberList = (members ?? []).map((m) => ({ id: m.id as string, name: m.name as string }))

  return (
    <div className="min-h-screen bg-slate-100">
      <InboxClient members={memberList} />
    </div>
  )
}
