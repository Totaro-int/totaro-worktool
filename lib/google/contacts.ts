/**
 * Google People API — 사용자 Google 연락처 CRUD.
 *
 * createContact 가 성공하면 resourceName (예: "people/c123...") 을 contacts 행에
 * 저장해서 다음 update/delete 에 활용.
 */
import { getAccessToken } from './oauth'

const API = 'https://people.googleapis.com/v1'

export type GoogleContactInput = {
  name: string
  company: string | null
  title: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  website: string | null
  address: string | null
  memo: string | null
}

type Person = { resourceName?: string; etag?: string }

function buildPersonBody(c: GoogleContactInput): Record<string, unknown> {
  const phoneNumbers: Array<{ value: string; type: string }> = []
  if (c.mobile) phoneNumbers.push({ value: c.mobile, type: 'mobile' })
  if (c.phone) phoneNumbers.push({ value: c.phone, type: 'work' })

  return {
    names: [{ givenName: c.name }],
    organizations:
      c.company || c.title ? [{ name: c.company ?? '', title: c.title ?? '' }] : undefined,
    phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
    emailAddresses: c.email ? [{ value: c.email, type: 'work' }] : undefined,
    urls: c.website ? [{ value: c.website, type: 'work' }] : undefined,
    addresses: c.address ? [{ formattedValue: c.address, type: 'work' }] : undefined,
    biographies: c.memo ? [{ value: c.memo, contentType: 'TEXT_PLAIN' }] : undefined,
  }
}

/** 새 연락처 생성. resourceName 반환. */
export async function createGoogleContact(
  userId: string,
  c: GoogleContactInput
): Promise<{ resourceName: string } | { error: string }> {
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨 (먼저 /contacts 에서 연결)' }
  const body = buildPersonBody(c)
  const r = await fetch(`${API}/people:createContact`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) return { error: `People API ${r.status}: ${(await r.text()).slice(0, 200)}` }
  const j = (await r.json()) as Person
  if (!j.resourceName) return { error: 'resourceName 응답 없음' }
  return { resourceName: j.resourceName }
}

/** 기존 연락처 업데이트 — resourceName 으로 식별. */
export async function updateGoogleContact(
  userId: string,
  resourceName: string,
  c: GoogleContactInput
): Promise<{ ok: true } | { error: string }> {
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨' }

  // updatePersonFields 는 변경할 필드 명시 필수
  const updateFields = [
    'names',
    'organizations',
    'phoneNumbers',
    'emailAddresses',
    'urls',
    'addresses',
    'biographies',
  ].join(',')
  // etag 먼저 받아오기
  const getR = await fetch(`${API}/${resourceName}?personFields=metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!getR.ok) return { error: `get etag ${getR.status}` }
  const existing = (await getR.json()) as Person
  const body = { ...buildPersonBody(c), etag: existing.etag }

  const r = await fetch(`${API}/${resourceName}:updateContact?updatePersonFields=${updateFields}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) return { error: `People API ${r.status}: ${(await r.text()).slice(0, 200)}` }
  return { ok: true }
}

/** 연락처 삭제 — resourceName 으로 식별. */
export async function deleteGoogleContact(
  userId: string,
  resourceName: string
): Promise<{ ok: true } | { error: string }> {
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨' }
  const r = await fetch(`${API}/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok && r.status !== 404) return { error: `People API ${r.status}` }
  return { ok: true }
}
