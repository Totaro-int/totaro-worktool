export type FileEntry = {
  id: string
  filename: string
  docType: string | null
  folderPath: string
  size: number
  createdAt: string
  driveFileId: string
  source: string | null
  description: string | null
  bodyExcerpt: string | null
}
