#!/bin/bash
set -euo pipefail

# Solo en sesiones remotas (Claude Code on the web) - en local el usuario ya
# gestiona su propio entorno.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm install
fi
