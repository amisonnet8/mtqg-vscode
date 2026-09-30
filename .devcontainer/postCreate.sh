#!/usr/bin/env bash
set -euo pipefail

# wget, gnupg,
# lsb-release:    Adding the Trivy apt repository below. (gh and pwsh come from
#                 the devcontainer features in devcontainer.json.)
# jq:             Inspecting mtqg's --json output while debugging the extension.
# ShellCheck:     Static analysis of tracked *.sh files (.claude/rules/testing.md).
#                 Comment lines must not start with the lowercase directive word,
#                 or ShellCheck parses them as directives (SC1072/SC1073).
# xvfb + the rest: running the real VS Code that @vscode/test-electron
#                 downloads, headless (qsoku test, test/vscode/,
#                 .claude/rules/testing.md, todo 97779f964e). This container
#                 has no display otherwise.
sudo apt-get update
sudo apt-get install -y wget gnupg lsb-release jq shellcheck \
  xvfb libnss3 libgtk-3-0 libasound2 libgbm1 libxkbfile1 libsecret-1-0 libxss1

# The Bash sandbox (.claude/settings.json) only honours an allowWrite path that
# already exists, and ~/.cache itself is read-only there. Create every
# filesystem.allowWrite path up front, or the first qsoku trivy in a fresh
# container fails with "read-only file system" (.claude/rules/testing.md).
# The list is read from settings.json, so this block needs no change when
# allowWrite does, and it is project-independent. "~/x" is created under the
# home directory; other absolute paths (e.g. /go) are created if they do not
# exist yet, and a failure only warns (no sudo is used). Relative paths and
# the special paths /dev, /proc and /sys are left alone.
sandbox_settings="$(dirname "$0")/../.claude/settings.json"
tilde='~'
if [ -f "$sandbox_settings" ]; then
  while IFS= read -r allow_path; do
    case "$allow_path" in
      "$tilde/"*) allow_path="$HOME/${allow_path#"$tilde/"}" ;;
      /dev/* | /proc/* | /sys/*) continue ;;
      /*) ;;
      *) continue ;;
    esac
    mkdir -p "$allow_path" || echo "warning: cannot create allowWrite path $allow_path" >&2
  done < <(jq -r '.sandbox.filesystem.allowWrite[]?' "$sandbox_settings")
fi

# Trivy: known vulnerabilities (CVE) and license compatibility of the npm
# dependencies (qsoku trivy, .claude/rules/testing.md). Installed from the
# official apt repository.
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list >/dev/null
sudo apt-get update
sudo apt-get install -y trivy

# qsoku: build/check/test entry points, once the extension's own qsokufile
# exists (mtqg's .claude/rules/testing.md, docs/design/history.md 2026-09-23).
# @latest, not pinned, while qsoku itself is still moving fast (decision,
# 2026-09-26, mirrors mtqg's own devcontainer/CI). Re-pin to a specific
# release once mtqg's own development settles down.
go install github.com/amisonnet8/qsoku/cmd/qsoku@latest

# mtqg: the process record for this repository (.claude/rules/mtqg-usage.md).
# @latest here, same as qsoku above -- this container is for day-to-day
# development, where always having the newest mtqg is more useful than a
# pinned version. This is *not* the version this extension declares as its
# floor: `src/mtqg/availability.ts`'s MIN_SUPPORTED_MTQG_VERSION and CI's own
# `go install ...@v1.0.0` (.github/workflows/ci.yml) stay pinned on purpose,
# so the extension's actual minimum stays a deliberately verified, stable
# version regardless of what this container happens to install (decision,
# 2026-09-29, todo 7a072cc72a).
go install github.com/amisonnet8/mtqg/cmd/mtqg@latest

# Wire up qsoku's shell integration (working-directory carry-back and
# completion) for bash. Idempotent: skipped if already present, so
# re-running postCreate.sh does not duplicate the line. The single quotes
# are intentional -- the line is meant to land in the rc file unexpanded.
# shellcheck disable=SC2016
grep -qF 'qsoku .shell bash' ~/.bashrc 2>/dev/null || echo 'eval "$(qsoku .shell bash)"' >>~/.bashrc

# mtqg's own bash completion, for interactive use in this container (mtqg
# completion <shell>, mtqg's docs/reference/cli.md).
mkdir -p ~/.local/share/bash-completion/completions
mtqg completion bash >~/.local/share/bash-completion/completions/mtqg

# npm dependencies for the extension itself, once package.json exists.
if [ -f package.json ]; then
  npm ci
fi
