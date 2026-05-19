#!/usr/bin/env node
/**
 * 코드 드리프트 감지 스크립트
 *
 * 프로젝트가 아키텍처 원칙에서 벗어나는지 검사합니다.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

interface DriftIssue {
  type: 'error' | 'warning'
  message: string
  file?: string
}

const issues: DriftIssue[] = []

function checkFileNaming(): void {
  console.log('📋 파일 명명 규칙 검사 중...')

  const checkDirectory = (dir: string, pattern: RegExp, description: string): void => {
    if (!existsSync(dir)) return

    const files = readdirSync(dir)

    files.forEach((file) => {
      const fullPath = join(dir, file)
      if (statSync(fullPath).isFile() && file.endsWith('.tsx')) {
        if (!pattern.test(file) && file !== 'page.tsx' && file !== 'layout.tsx') {
          issues.push({
            type: 'warning',
            message: `파일명이 규칙에 맞지 않음: ${description}`,
            file: fullPath.replace(process.cwd() + '/', ''),
          })
        }
      }
    })
  }

  // 컴포넌트는 PascalCase
  if (existsSync('components')) {
    checkDirectory('components/ui', /^[A-Z][a-zA-Z]*\.tsx$/, 'UI 컴포넌트는 PascalCase')
    checkDirectory('components/features', /^[A-Z][a-zA-Z]*\.tsx$/, '기능 컴포넌트는 PascalCase')
  }
}

function checkImportOrder(): void {
  console.log('📦 Import 순서 검사 중...')

  const checkFile = (filePath: string): void => {
    if (!existsSync(filePath)) return

    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    let lastImportType = 0 // 0: none, 1: external, 2: internal, 3: relative, 4: type

    lines.forEach((line, index) => {
      if (!line.trim().startsWith('import')) return

      let currentType = 0

      if (line.includes('from "react"') || line.includes("from 'react'")) {
        currentType = 1
      } else if (line.includes('from "@/')) {
        currentType = 2
      } else if (line.includes('from "./') || line.includes("from '../")) {
        currentType = 3
      } else if (line.includes('import type')) {
        currentType = 4
      } else if (line.includes('from "') || line.includes("from '")) {
        currentType = 1
      }

      if (currentType < lastImportType && currentType !== 0) {
        issues.push({
          type: 'warning',
          message: `Import 순서가 올바르지 않음 (라인 ${index + 1})`,
          file: filePath.replace(process.cwd() + '/', ''),
        })
      }

      lastImportType = currentType
    })
  }

  // 샘플로 몇 개 파일만 검사
  if (existsSync('app/page.tsx')) checkFile('app/page.tsx')
  if (existsSync('app/layout.tsx')) checkFile('app/layout.tsx')
}

function checkConsoleStatements(): void {
  console.log('🚫 console.log 검사 중...')

  const checkDirectory = (dir: string): void => {
    if (!existsSync(dir)) return

    const files = readdirSync(dir)

    files.forEach((file) => {
      const fullPath = join(dir, file)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !file.startsWith('.')) {
        checkDirectory(fullPath)
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const content = readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.trim().startsWith('//')) {
            issues.push({
              type: 'warning',
              message: `console.log 발견 (라인 ${index + 1})`,
              file: fullPath.replace(process.cwd() + '/', ''),
            })
          }
        })
      }
    })
  }

  checkDirectory('app')
  checkDirectory('components')
  checkDirectory('lib')
}

function checkLargeComponents(): void {
  console.log('📏 큰 컴포넌트 검사 중...')

  const MAX_LINES = 300

  const checkDirectory = (dir: string): void => {
    if (!existsSync(dir)) return

    const files = readdirSync(dir)

    files.forEach((file) => {
      const fullPath = join(dir, file)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !file.startsWith('.')) {
        checkDirectory(fullPath)
      } else if (stat.isFile() && file.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n').length

        if (lines > MAX_LINES) {
          issues.push({
            type: 'warning',
            message: `컴포넌트가 너무 큼 (${lines}줄, 권장: ${MAX_LINES}줄 이하)`,
            file: fullPath.replace(process.cwd() + '/', ''),
          })
        }
      }
    })
  }

  checkDirectory('components')
  checkDirectory('app')
}

function main(): void {
  console.log('🔍 코드 드리프트 검사 시작...\n')

  checkFileNaming()
  checkImportOrder()
  checkConsoleStatements()
  checkLargeComponents()

  console.log('\n' + '='.repeat(50) + '\n')

  const errors = issues.filter((i) => i.type === 'error')
  const warnings = issues.filter((i) => i.type === 'warning')

  if (errors.length > 0) {
    console.log('❌ 에러:')
    errors.forEach((issue) => {
      console.log(`  - ${issue.message}`)
      if (issue.file) console.log(`    파일: ${issue.file}`)
    })
    console.log()
  }

  if (warnings.length > 0) {
    console.log('⚠️  경고:')
    warnings.forEach((issue) => {
      console.log(`  - ${issue.message}`)
      if (issue.file) console.log(`    파일: ${issue.file}`)
    })
    console.log()
  }

  if (issues.length === 0) {
    console.log('✅ 코드 드리프트가 발견되지 않았습니다!')
  }

  console.log('='.repeat(50))

  // 경고는 실패로 처리하지 않음
  process.exit(errors.length > 0 ? 1 : 0)
}

main()
