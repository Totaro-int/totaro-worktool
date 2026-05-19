#!/usr/bin/env node
/**
 * 디렉토리 구조 검증 스크립트
 *
 * AGENTS.md에 정의된 디렉토리 구조를 따르는지 검증합니다.
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const REQUIRED_DIRS = ['app', 'app/(app)', 'components', 'lib', 'docs', 'public']

const EXPECTED_STRUCTURE = {
  components: ['ui', 'features', 'layout'],
  lib: ['supabase', 'hooks', 'utils'],
  docs: [],
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function checkDirectoryStructure(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  console.log('🔍 디렉토리 구조 검증 중...\n')

  // 1. 필수 디렉토리 확인
  for (const dir of REQUIRED_DIRS) {
    if (!existsSync(dir)) {
      errors.push(`필수 디렉토리 누락: ${dir}`)
    } else {
      console.log(`✅ ${dir}`)
    }
  }

  // 2. 하위 디렉토리 구조 확인
  for (const [parent, expectedChildren] of Object.entries(EXPECTED_STRUCTURE)) {
    if (!existsSync(parent)) continue

    const actualChildren = readdirSync(parent).filter((item) => {
      const fullPath = join(parent, item)
      return statSync(fullPath).isDirectory()
    })

    for (const expected of expectedChildren) {
      if (!actualChildren.includes(expected)) {
        warnings.push(`권장 디렉토리 누락: ${parent}/${expected}`)
      }
    }
  }

  // 3. 잘못된 위치의 컴포넌트 파일 확인
  const rootFiles = readdirSync('.').filter((file) => {
    return file.endsWith('.tsx') && !['layout.tsx', 'page.tsx'].includes(file)
  })

  if (rootFiles.length > 0) {
    warnings.push(`루트에 컴포넌트 파일 존재: ${rootFiles.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function main(): void {
  const result = checkDirectoryStructure()

  console.log('\n' + '='.repeat(50))

  if (result.errors.length > 0) {
    console.log('\n❌ 에러:')
    result.errors.forEach((err) => console.log(`  - ${err}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  경고:')
    result.warnings.forEach((warn) => console.log(`  - ${warn}`))
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('\n✨ 디렉토리 구조가 올바릅니다!')
  }

  console.log('\n' + '='.repeat(50))

  process.exit(result.valid ? 0 : 1)
}

main()
