export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Supabase 환경변수가 모두 설정되었는지 여부 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Honeypot 로깅용 service_role 키가 설정되어 있는지 */
export const isHoneypotLoggingConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
