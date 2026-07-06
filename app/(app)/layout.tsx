import { redirect } from 'next/navigation'

import { signOut } from '@/app/auth/actions'
import { AppNav } from '@/components/AppNav'
import { NotificationsFloat } from '@/components/notifications-float'
import { PushManager } from '@/components/push-manager'
import { SetupNotice } from '@/components/setup-notice'
import { isSupabaseConfigured } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.JSX.Element> {
  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c1830] p-6">
        <SetupNotice />
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let userName = user.email?.split('@')[0] ?? '멤버'
  const { data: memberRow } = await supabase
    .from('members')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()
  if (memberRow?.name) userName = memberRow.name

  return (
    <div className="min-h-screen" style={{ background: '#081120' }}>
      <NotificationsFloat />
      <PushManager />
      <AppNav userName={userName} logoutAction={signOut} />
      {/* 모바일 하단 고정 탭 바 높이만큼 여백 확보 */}
      <div className="pb-16 md:pb-0">{children}</div>
    </div>
  )
}
