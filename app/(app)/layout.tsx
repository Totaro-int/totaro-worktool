import { redirect } from 'next/navigation'

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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <SetupNotice />
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-slate-100">
      <NotificationsFloat />
      <PushManager />
      {children}
    </main>
  )
}
