/**
 * lint-staged 설정
 *
 * Git staged 파일에 대해 자동으로 실행되는 작업
 */

module.exports = {
  // TypeScript/React 파일
  '**/*.{ts,tsx}': ['prettier --write', 'eslint --fix'],

  // JavaScript 파일
  '**/*.{js,mjs,cjs}': ['prettier --write', 'eslint --fix'],

  // JSON, Markdown 등
  '**/*.{json,md,yml,yaml}': ['prettier --write'],

  // CSS
  '**/*.css': ['prettier --write'],
}
