#!/usr/bin/env bash
set -euo pipefail

# wget, gnupg,
# lsb-release:    Adding the Trivy and GitHub CLI apt repositories below.
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

# Trivy: known vulnerabilities (CVE) and license compatibility of the npm
# dependencies (qsoku trivy, .claude/rules/testing.md). Installed from the
# official apt repository.
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list >/dev/null
sudo apt-get update
sudo apt-get install -y trivy

# gh: GitHub CLI, for checking issues, pull requests and Actions runs.
# Installed from the official apt repository (same pattern as Trivy).
sudo mkdir -p -m 755 /etc/apt/keyrings
wget -qO - https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
sudo apt-get update
sudo apt-get install -y gh

# qsoku: build/check/test entry points, once the extension's own qsokufile
# exists (mtqg's .claude/rules/testing.md, docs/design/history.md 2026-09-23).
# @latest, not pinned, while qsoku itself is still moving fast (decision,
# 2026-09-26, mirrors mtqg's own devcontainer/CI). Re-pin to a specific
# release once mtqg's own development settles down.
go install github.com/amisonnet8/qsoku/cmd/qsoku@latest

# mtqg: the process record for this repository (.claude/rules/mtqg-usage.md).
# A pinned, known-good release of a separate, external project -- a broken
# build there must not be able to corrupt this repository's own records.
# v0.3.0: adds --at, `log --before` and `log --json --events` (only additive
# fields/flags, verified against this repository before bumping the pin,
# .claude/rules/mtqg-cli.md "版"; todo 57713a45f4).
# v0.4.0: `log --json --events` now includes deleted records (each with
# `deleted: true` and, for the delete itself, an `op:"delete"` event) --
# `--events` off, or any other read command, is unchanged (verified before
# bumping the pin; todo 01ee2706ce follow-up, commit 684c87d upstream).
# v1.0.0: mtqg's own v1 (journal format bumped 0->1, plus a new `mtqg
# upgrade` command); --json is unchanged for every command this extension
# calls (only a new `upgrade` command's own output was added -- verified via
# the source diff between the two release tags before bumping the pin, todo
# 239043c4c6).
go install github.com/amisonnet8/mtqg/cmd/mtqg@v1.0.0

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
