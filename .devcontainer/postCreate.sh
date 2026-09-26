#!/usr/bin/env bash
set -euo pipefail

# wget, gnupg,
# lsb-release:    Adding the Trivy and GitHub CLI apt repositories below.
# jq:             Inspecting mtqg's --json output while debugging the extension.
# ShellCheck:     Static analysis of tracked *.sh files (.claude/rules/testing.md).
#                 Comment lines must not start with the lowercase directive word,
#                 or ShellCheck parses them as directives (SC1072/SC1073).
sudo apt-get update
sudo apt-get install -y wget gnupg lsb-release jq shellcheck

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
# Pinned so a qsoku regression cannot break this container unnoticed.
go install github.com/amisonnet8/qsoku/cmd/qsoku@v0.1.1

# mtqg: the process record for this repository (.claude/rules/mtqg-usage.md).
# A pinned, known-good version, installed the same way mtqg's own devcontainer
# installs it -- a broken build must not be able to corrupt its own records.
go install github.com/amisonnet8/mtqg/cmd/mtqg@v0.2.0

# Wire up qsoku's shell integration (working-directory carry-back and
# completion) for bash. Idempotent: skipped if already present, so
# re-running postCreate.sh does not duplicate the line. The single quotes
# are intentional -- the line is meant to land in the rc file unexpanded.
# shellcheck disable=SC2016
grep -qF 'qsoku .shell bash' ~/.bashrc 2>/dev/null || echo 'eval "$(qsoku .shell bash)"' >>~/.bashrc

# npm dependencies for the extension itself, once package.json exists.
if [ -f package.json ]; then
  npm ci
fi
