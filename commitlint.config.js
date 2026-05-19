/**
 * Commitlint 설정
 *
 * 커밋 메시지 규칙:
 * - feat: 새로운 기능
 * - fix: 버그 수정
 * - docs: 문서 수정
 * - style: 코드 포맷팅 (기능 변경 없음)
 * - refactor: 코드 리팩토링
 * - test: 테스트 추가/수정
 * - chore: 빌드, 설정 등
 *
 * 예시: feat: 사용자 프로필 페이지 추가
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 새로운 기능
        'fix', // 버그 수정
        'docs', // 문서 수정
        'style', // 코드 포맷팅
        'refactor', // 리팩토링
        'test', // 테스트
        'chore', // 빌드, 설정
        'perf', // 성능 개선
        'ci', // CI 설정
        'revert', // 되돌리기
      ],
    ],
    'subject-case': [0], // 제목 대소문자 제약 없음 (한글 대응)
    'header-max-length': [2, 'always', 100],
  },
}
