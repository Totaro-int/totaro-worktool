/** 회사 연락처 — 명함 OCR → DB 저장 → 리스트/검색. Google Contacts 연동은 Phase 2. */
import type { JSX } from 'react'

import { loadContacts } from './actions'
import { ContactsClient } from './ContactsClient'


export const dynamic = 'force-dynamic'

export default async function ContactsPage(): Promise<JSX.Element> {
  const contacts = await loadContacts()
  return <ContactsClient initial={contacts} />
}
