#!/usr/bin/env bash
# Build after a TypeScript or package file is edited, and report failures to Claude.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts | */package.json | */tsconfig.json) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR"

# The extension's scaffold (qsokufile, package.json) does not exist yet in the
# initial setup. Nothing to build until it does.
if [ ! -f qsokufile ]; then
  exit 0
fi

if ! output=$(qsoku build 2>&1); then
  echo "$output" >&2
  exit 2
fi
