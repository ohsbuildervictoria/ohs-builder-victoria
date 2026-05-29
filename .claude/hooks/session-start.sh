#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions, where the repo is
# cloned fresh and dependencies need installing each session.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies. Idempotent and cache-friendly (npm install over npm ci).
echo "--- Installing dependencies ---"
npm install

# Surface linter and test status at session start so issues are visible
# immediately. Non-fatal: a failure here must not block the session.
echo "--- Running ESLint ---"
npm run lint || echo "::lint reported issues::"

echo "--- Running tests ---"
npm test || echo "::tests reported failures::"

echo "--- Session start hook complete ---"
