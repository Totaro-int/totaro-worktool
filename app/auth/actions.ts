'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/** 구글 OAuth 로그인 시작 — Supabase 가 발급한 URL 로 리다이렉트한다. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()
  const hdrs = await headers()
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    hdrs.get('origin') ||
    `https://${hdrs.get('host')}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) throw error
  if (data.url) redirect(data.url)
}

/** 로그아웃 후 로그인 화면으로 이동 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
