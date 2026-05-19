#!/usr/bin/env node
/**
 * 큰 파일 감지 스크립트
 *
 * 프로젝트에서 불필요하게 큰 파일을 찾아 경고합니다.
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const MAX_FILE_SIZE = 500 * 1024 // 500KB
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', 'coverage']
const IGNORE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico']

interface LargeFile {
  path: string
  size: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function findLargeFiles(dir: string, files: LargeFile[] = []): LargeFile[] {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const relativePath = fullPath.replace(process.cwd() + '/', '')

    // 무시할 디렉토리
    if (IGNORE_DIRS.some((ignored) => relativePath.startsWith(ignored))) {
      continue
    }

    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      findLargeFiles(fullPath, files)
    } else if (stat.isFile()) {
      // 이미지 파일 제외
      const ext = fullPath.substring(fullPath.lastIndexOf('.')).toLowerCase()
      if (IGNORE_EXTENSIONS.includes(ext)) {
        continue
      }

      if (stat.size > MAX_FILE_SIZE) {
        files.push({
          path: relativePath,
          size: stat.size,
        })
      }
    }
  }

  return files
}

function main(): void {
  console.log('🔍 큰 파일 검사 중...\n')
  console.log(`기준: ${formatBytes(MAX_FILE_SIZE)} 이상\n`)

  const largeFiles = findLargeFiles(process.cwd())

  if (largeFiles.length === 0) {
    console.log('✅ 문제되는 큰 파일이 없습니다!')
  } else {
    console.log('⚠️  다음 파일들이 비정상적으로 큽니다:\n')

    // 크기 순으로 정렬
    largeFiles.sort((a, b) => b.size - a.size)

    largeFiles.forEach((file) => {
      console.log(`  📁 ${file.path}`)
      console.log(`     크기: ${formatBytes(file.size)}`)
      console.log()
    })

    console.log('💡 권장 조치:')
    console.log('  - 불필요한 파일이라면 삭제')
    console.log('  - 빌드 산출물이라면 .gitignore에 추가')
    console.log('  - 큰 JSON/CSV 파일은 외부 저장소 사용 고려')
    console.log('  - 번들 파일은 코드 스플리팅 고려')
  }

  console.log('\n' + '='.repeat(50))

  process.exit(largeFiles.length > 0 ? 1 : 0)
}

main()
