#!/bin/bash
# PostToolUse (Edit|Write): formatea y corrige lint de un archivo .py recién editado con ruff.
# Silencioso si ruff no está instalado o el archivo no es Python.

set -u
entrada="$(cat)"
archivo="$(printf '%s' "$entrada" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)"
[ -z "$archivo" ] && exit 0
case "$archivo" in *.py) ;; *) exit 0 ;; esac
[ -f "$archivo" ] || exit 0

raiz="${CLAUDE_PROJECT_DIR:-$(pwd)}"
if [ -x "$raiz/.venv/bin/ruff" ]; then
  ruff="$raiz/.venv/bin/ruff"
elif command -v ruff >/dev/null 2>&1; then
  ruff="ruff"
else
  exit 0
fi

"$ruff" check --fix --quiet "$archivo" >/dev/null 2>&1 || true
"$ruff" format --quiet "$archivo" >/dev/null 2>&1 || true
exit 0
