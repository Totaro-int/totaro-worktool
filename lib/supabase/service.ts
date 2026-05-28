import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/lib/env'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * RLS 를 우회하는 service_role 클라이언트.
 * **서버 측에서만 사용.** 라우트 핸들러 / 서버 액션 안에서만 호출하라.
 * 클라이언트 컴포넌트에서 임포트하면 키가 번들에 들어가므로 절대 금지.
 */
export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Honeypot logging requires SUPABASE_SERVICE_ROLE_KEY. ' +
        '.env.local 에 키를 추가하세요 (Supabase Dashboard → Settings → API → service_role).'
    )
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
