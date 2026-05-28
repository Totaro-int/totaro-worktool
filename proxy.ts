import { updateSession } from '@/lib/supabase/middleware'

import type { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  return await updateSession(request)
}

export const config = {
  // honeypot/robots 는 공개 + 저지연이어야 해서 세션 갱신에서 제외
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|honeypot|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
