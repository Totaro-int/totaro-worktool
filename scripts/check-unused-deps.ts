#!/usr/bin/env node
/**
 * 사용되지 않는 의존성 감지 스크립트
 *
 * depcheck를 사용하여 사용되지 않는 npm 패키지를 찾습니다.
 */

import depcheck from 'depcheck'

const options = {
  ignoreBinPackage: false,
  skipMissing: false,
  ignorePatterns: ['.next', 'node_modules', 'dist', 'build', 'coverage'],
  ignoreMatches: [
    // Next.js가 자동으로 사용하는 패키지
    'next',
    'react',
    'react-dom',
    'typescript',
    'tailwindcss',
    '@tailwindcss/postcss',

    // 개발 도구 (설정 파일에서 사용)
    'eslint',
    'prettier',
    // .prettierrc 의 plugins 배열에서 사용 — depcheck가 감지 못함
    'prettier-plugin-tailwindcss',
    'husky',
    'lint-staged',
    '@commitlint/cli',
    '@commitlint/config-conventional',
    'tsx',
    'depcheck',

    // TypeScript 타입 정의
    '@types/node',
    '@types/react',
    '@types/react-dom',
  ],
}

async function main(): Promise<void> {
  console.log('🔍 사용되지 않는 의존성 검사 중...\n')

  const results = await depcheck(process.cwd(), options)

  let hasIssues = false

  // 사용되지 않는 의존성
  if (results.dependencies.length > 0) {
    hasIssues = true
    console.log('❌ 사용되지 않는 dependencies:')
    results.dependencies.forEach((dep) => {
      console.log(`  - ${dep}`)
    })
    console.log('\n💡 제거 방법: npm uninstall ' + results.dependencies.join(' '))
    console.log()
  }

  // 사용되지 않는 devDependencies
  if (results.devDependencies.length > 0) {
    hasIssues = true
    console.log('❌ 사용되지 않는 devDependencies:')
    results.devDependencies.forEach((dep) => {
      console.log(`  - ${dep}`)
    })
    console.log('\n💡 제거 방법: npm uninstall ' + results.devDependencies.join(' '))
    console.log()
  }

  // 누락된 의존성
  const missing = Object.keys(results.missing)
  if (missing.length > 0) {
    hasIssues = true
    console.log('⚠️  package.json에 없는 의존성:')
    missing.forEach((dep) => {
      console.log(`  - ${dep}`)
      console.log(`    사용 위치: ${results.missing[dep].join(', ')}`)
    })
    console.log('\n💡 설치 방법: npm install ' + missing.join(' '))
    console.log()
  }

  if (!hasIssues) {
    console.log('✅ 모든 의존성이 올바르게 사용되고 있습니다!')
  }

  console.log('\n' + '='.repeat(50))

  process.exit(hasIssues ? 1 : 0)
}

main().catch((error) => {
  console.error('에러 발생:', error)
  process.exit(1)
})
