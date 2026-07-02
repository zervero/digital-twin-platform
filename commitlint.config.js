/**
 * commitlint configuration.
 *
 * Enforces Conventional Commits so we can:
 *   - auto-generate CHANGELOG
 *   - auto-bump semver
 *   - keep `git log` greppable
 *
 * Type list follows the conventional-commits spec. `scope` is the package
 * name when the change is scoped to one package, otherwise empty.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow Chinese subjects; cap length to keep `git log --oneline` readable.
    'header-max-length': [2, 'always', 72],
    // Type allowlist matches our plan in docs/development/contributing.md.
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'docs',
        'build',
        'ci',
        'chore',
        'style',
        'revert',
      ],
    ],
    // Lowercase type is the convention; we relax it to allow `Feat` for
    // muscle memory but warn instead of error.
    'type-case': [1, 'always', 'lower-case'],
  },
};
