'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** 보고서 마크다운 렌더 — 차분한 본문 톤(대시보드 카드용). */
export function ReportView({ content }: { content: string }): React.JSX.Element {
  return (
    <div className="markdown-body text-sm leading-relaxed break-words text-[#c4d2e4]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mt-1 mb-2 text-base font-bold text-[#dbe7f4]" {...p} />,
          h2: (p) => <h2 className="mt-4 mb-2 text-sm font-bold text-[#dbe7f4]" {...p} />,
          h3: (p) => <h3 className="mt-3 mb-1.5 text-sm font-semibold text-[#dbe7f4]" {...p} />,
          p: (p) => <p className="mb-2 last:mb-0" {...p} />,
          strong: (p) => <strong className="font-semibold text-[#dbe7f4]" {...p} />,
          ul: (p) => <ul className="my-2 ml-5 list-disc space-y-1" {...p} />,
          ol: (p) => <ol className="my-2 ml-5 list-decimal space-y-1" {...p} />,
          li: (p) => <li className="leading-snug" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-2 border-l-2 border-[#1c3556] pl-3 text-[#8ea0b8]" {...p} />
          ),
          hr: () => <hr className="my-3 border-[#12233c]" />,
          a: ({ children, href, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[#35e0ff] underline underline-offset-2 hover:text-indigo-800"
              {...rest}
            >
              {children}
            </a>
          ),
          table: (p) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border border-[#1c3556] bg-[#0c1830] px-2 py-1.5 font-semibold" {...p} />
          ),
          td: (p) => <td className="border border-[#1c3556] px-2 py-1.5 align-top" {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
