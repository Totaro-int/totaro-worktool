/** 회사 연락처 — 명함 OCR → DB 저장 + Google 연락처 동기화. */
import type { JSX } from 'react'

import { getGoogleConnection, loadContacts } from './actions'
import { ContactsClient } from './ContactsClient'

export const dynamic = 'force-dynamic'

export default async function ContactsPage(): Promise<JSX.Element> {
  const [contacts, google] = await Promise.all([loadContacts(), getGoogleConnection()])
  return <ContactsClient initial={contacts} google={google} />
}
