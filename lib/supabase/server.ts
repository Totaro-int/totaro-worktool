import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'

import type { SupabaseClient } from '@supabase/supabase-js'

/** 서버 컴포넌트 / 서버 액션 / 라우트 핸들러용 Supabase 클라이언트 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // 서버 컴포넌트에서 호출된 경우 — 세션 갱신은 middleware 가 담당하므로 무시
        }
      },
    },
  })
}
