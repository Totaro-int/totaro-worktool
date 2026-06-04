/**
 * 파일 텍스트 추출 — 내부 AI 우편실 v0.
 *
 * 분류 전 단계. 파일 타입별로 텍스트(또는 이미지 의도)를 뽑아 Claude에 전달한다.
 * Tier 1 (텍스트 추출 가능): PDF·docx·txt·md
 * Tier 2 (이미지 처리 — caller가 Claude Vision으로): jpg·png·heic·스캔 PDF
 * Tier 3 (파일명만): hwp·mp3·mp4·zip·기타
 */
import mammoth from 'mammoth'

const MAX_EXTRACT_LEN = 4000 // Claude prompt에 들어갈 최대 길이

/** pdf-parse 는 CJS 패키지라 dynamic import 로 interop 처리. */
type PdfParseFn = (buf: Buffer) => Promise<{ text?: string }>
let cachedPdfParse: PdfParseFn | null = null
async function getPdfParse(): Promise<PdfParseFn> {
  if (cachedPdfParse) return cachedPdfParse
  const mod = (await import('pdf-parse')) as unknown as { default?: PdfParseFn } & PdfParseFn
  cachedPdfParse = mod.default ?? mod
  return cachedPdfParse
}

export type ExtractedContent = {
  tier: 1 | 2 | 3
  /** 추출된 텍스트 — tier 1·일부 2에서 채움. tier 3는 비어있음 */
  text: string
  /** Vision 모드 사용 권고 — tier 2 이미지일 때 */
  useVision: boolean
  /** 디버그·로그용 추출 메서드 라벨 */
  method: string
}

/** MIME 타입으로부터 적절한 추출 메서드 호출. */
export async function extractContent(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractedContent> {
  const lower = filename.toLowerCase()
  const mime = (mimeType ?? '').toLowerCase()

  // PDF
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
    try {
      const pdfParse = await getPdfParse()
      const result = await pdfParse(buffer)
      const text = (result.text ?? '').trim()
      if (text.length >= 40) {
        return {
          tier: 1,
          text: text.slice(0, MAX_EXTRACT_LEN),
          useVision: false,
          method: 'pdf-parse',
        }
      }
      // 텍스트 거의 없으면 스캔 PDF — Vision으로 폴백
      return { tier: 2, text: '', useVision: true, method: 'pdf-scan→vision' }
    } catch {
      return { tier: 2, text: '', useVision: true, method: 'pdf-parse-error→vision' }
    }
  }

  // docx
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer })
      const text = (result.value ?? '').trim()
      return {
        tier: 1,
        text: text.slice(0, MAX_EXTRACT_LEN),
        useVision: false,
        method: 'mammoth',
      }
    } catch {
      return { tier: 3, text: '', useVision: false, method: 'docx-error' }
    }
  }

  // txt·md
  if (mime.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) {
    try {
      const text = buffer.toString('utf-8').trim()
      return { tier: 1, text: text.slice(0, MAX_EXTRACT_LEN), useVision: false, method: 'utf-8' }
    } catch {
      return { tier: 3, text: '', useVision: false, method: 'text-decode-error' }
    }
  }

  // 이미지 (jpg/png/heic/webp/gif)
  if (mime.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(lower)) {
    return { tier: 2, text: '', useVision: true, method: 'image→vision' }
  }

  // 한글 hwp — v0는 파일명만
  if (lower.endsWith('.hwp') || lower.endsWith('.hwpx')) {
    return { tier: 3, text: '', useVision: false, method: 'hwp-filename-only(v0)' }
  }

  // 음성·영상·zip·기타 — 파일명만
  return { tier: 3, text: '', useVision: false, method: 'filename-only' }
}
