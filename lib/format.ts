/** ISO 시각이 지금 기준으로 maxAgeMs 보다 오래됐으면 true. */
export function isStale(iso: string, maxAgeMs: number): boolean {
  return Date.now() - new Date(iso).getTime() > maxAgeMs
}

/** ISO 시각을 "3시간 전" 같은 상대 표기로 변환 */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 0) return '방금 전'
  if (sec < 60) return '방금 전'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return formatDate(iso)
}

/** ISO 시각을 "2026년 5월 17일" 표기로 변환 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** 파일 크기를 사람이 읽기 좋은 단위로 변환 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}
