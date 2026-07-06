import type { JSX } from 'react'

/** Supabase 환경변수가 없을 때 표시하는 초기 설정 안내 */
export function SetupNotice(): JSX.Element {
  return (
    <div className="w-full max-w-lg rounded-2xl bg-[#101f38] p-8 shadow-sm ring-1 ring-[#1c3556]">
      <h1 className="text-lg font-semibold text-[#dbe7f4]">초기 설정이 필요합니다</h1>
      <p className="mt-2 text-sm text-[#9fb4d0]">
        Supabase 연결 정보가 아직 설정되지 않았습니다. 아래 순서를 따라주세요.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#c4d2e4]">
        <li>
          <span className="font-medium">supabase.com</span> 에서 새 프로젝트를 만듭니다.
        </li>
        <li>
          SQL Editor 에{' '}
          <code className="rounded bg-[#0c1830] px-1 py-0.5 text-xs">supabase/schema.sql</code>{' '}
          내용을 붙여넣고 실행합니다.
        </li>
        <li>Project Settings → API 에서 URL 과 anon key 를 복사합니다.</li>
        <li>
          프로젝트 루트에{' '}
          <code className="rounded bg-[#0c1830] px-1 py-0.5 text-xs">.env.local</code> 파일을 만들어
          값을 채웁니다.
        </li>
        <li>개발 서버를 다시 시작합니다.</li>
      </ol>
      <p className="mt-4 text-xs text-[#6b7c96]">자세한 안내는 README.md 를 참고하세요.</p>
    </div>
  )
}
