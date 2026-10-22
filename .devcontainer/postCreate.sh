#!/usr/bin/env bash
set -euo pipefail

# The shells this container is set up for: qsoku's shell integration and the
# completion of bcuz, crube, mtqg and srwr go into each of them (the end of this file).
# bash only by default. A project that runs its own shell scripts in the real
# shells (completion scripts, shell integration) lists all four instead,
#   shells=(bash zsh fish pwsh)
# and adds "ghcr.io/devcontainers/features/powershell:2.0.3": {} to the features
# of devcontainer.json (.claude/rules/testing.md). bash and zsh are in the base
# image, fish is installed below, and pwsh comes only from that feature.
shells=(bash)
has_shell() {
  local shell
  for shell in "${shells[@]}"; do
    [ "$shell" = "$1" ] && return 0
  done
  return 1
}
if has_shell pwsh && ! command -v pwsh >/dev/null 2>&1; then
  echo 'error: shells lists pwsh, but there is no pwsh: add the "powershell" feature to devcontainer.json and rebuild' >&2
  exit 1
fi

# wget, gnupg,
# lsb-release: Adding the Trivy apt repository below.
# jq:          Used by .claude/hooks/build.sh, .claude/hooks/require-bcuz.sh (and
#              its test, qsoku hook) and the allowWrite block below; also for
#              inspecting mtqg's --json output while debugging the extension.
# ShellCheck:  Static analysis of tracked *.sh and *.bash files (qsoku shellcheck).
#              Comment lines must not start with the lowercase directive word,
#              or ShellCheck parses them as directives (SC1072/SC1073).
# gh:          GitHub CLI (issues, pull requests, Actions runs) is the "github-cli"
#              feature in devcontainer.json, not installed here. The feature is left
#              unpinned (no "version" option): each rebuild installs the latest release.
# xvfb + the rest: running the real VS Code that @vscode/test-electron
#              downloads, headless (qsoku test, test/vscode/,
#              .claude/rules/testing.md, todo 97779f964e). This container
#              has no display otherwise.
# fish:        Only when shells (above) lists it.
shell_packages=()
if has_shell fish; then shell_packages+=(fish); fi
sudo apt-get update
sudo apt-get install -y wget gnupg lsb-release jq shellcheck \
  xvfb libnss3 libgtk-3-0 libasound2 libgbm1 libxkbfile1 libsecret-1-0 libxss1 \
  "${shell_packages[@]}"

# The Bash sandbox (.claude/settings.json "sandbox") needs bubblewrap (bwrap)
# and socat on Linux; without them it silently stays off even with
# "enabled": true. Install only what is missing, since some base images
# already have them. Project-independent (.claude/rules/testing.md).
missing_sandbox_deps=()
command -v bwrap >/dev/null 2>&1 || missing_sandbox_deps+=(bubblewrap)
command -v socat >/dev/null 2>&1 || missing_sandbox_deps+=(socat)
if [ "${#missing_sandbox_deps[@]}" -gt 0 ]; then
  sudo apt-get update
  sudo apt-get install -y "${missing_sandbox_deps[@]}"
fi

# Trivy: known vulnerabilities (CVE) and license compatibility of the npm
# dependencies (qsoku trivy, .claude/rules/testing.md). Installed from the
# official apt repository.
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list >/dev/null
sudo apt-get update
sudo apt-get install -y trivy

# The Bash sandbox (.claude/settings.json) only honours an allowWrite path that
# already exists, and ~/.cache itself is read-only there. Create every
# filesystem.allowWrite path up front, or the first qsoku trivy / npm ci in
# a fresh container fails with "read-only file system" (.claude/rules/testing.md).
# The list is read from settings.json, so this block needs no change when
# allowWrite does, and it is project-independent. "~/x" and "$HOME/x" are created
# under the home directory; other absolute paths (e.g. /go) are created if they do
# not exist yet, and a failure only warns (no sudo is used). Relative paths, "."
# and $TMPDIR, and the special paths /dev, /proc and /sys are left alone.
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

# qsoku: build/check/test entry points (qsokufile).
go install github.com/amisonnet8/qsoku/cmd/qsoku@latest

# mtqg: the process record for this repository (.claude/rules/mtqg-usage.md).
# @latest here, same as qsoku above -- this container is for day-to-day
# development, where always having the newest mtqg is more useful than a
# pinned version. This is *not* the version this extension declares as its
# floor: `src/mtqg/availability.ts`'s MIN_SUPPORTED_MTQG_VERSION stays pinned
# on purpose, and CI (.github/workflows/ci.yml) tries both that floor and
# @latest, so the extension's actual minimum stays a deliberately verified
# version regardless of what this container happens to install.
go install github.com/amisonnet8/mtqg/cmd/mtqg@latest

# srwr: the AI's edits go through its look / edit / new tools, each with a
# reason (why), and are recorded on a tape (.claude/rules/srwr-usage.md).
# @latest, like qsoku and mtqg above. srwr is 0.x, so after a rebuild that
# picked up a new version, run `srwr init` once: it makes .claude/settings.json
# follow any change in the tools' names.
go install github.com/amisonnet8/srwr/cmd/srwr@latest

# bcuz: every command Claude Code runs through the Bash tool goes through
# `bcuz "<reason>" <command>`, which records when / why / what / result in
# .bcuz/history.jsonl (.claude/rules/bcuz-usage.md; enforced by the PreToolUse
# hook .claude/hooks/require-bcuz.sh). @latest, like the tools above.
go install github.com/amisonnet8/bcuz/cmd/bcuz@latest

# Create .bcuz/ at the repository root (idempotent: prints "already exists"
# and succeeds if it is there). Without it, commands still run but are not recorded.
(cd "$(dirname "$0")/.." && bcuz --init)

# crube: descriptions of this repository's files and directories in .crube/,
# used by Claude Code through the crube / crube-ja MCP servers of .mcp.json,
# the CLI and the hook .claude/hooks/crube-untracked.sh
# (.claude/rules/crube-usage.md). @latest, like the tools above.
go install github.com/amisonnet8/crube/cmd/crube@latest

# pwsh has no $PROFILE of its own until asked: query it rather than hardcode
# the path. zsh's fpath[1] in this image is a root-owned system directory. The
# single quotes are intentional: $PROFILE and $fpath are not bash's.
if has_shell pwsh; then
  # shellcheck disable=SC2016
  pwsh_profile=$(pwsh -NoLogo -NoProfile -Command '$PROFILE')
  mkdir -p "$(dirname "$pwsh_profile")"
fi
if has_shell zsh; then
  # shellcheck disable=SC2016
  zsh_fpath=$(zsh -fc 'echo $fpath[1]')
  sudo mkdir -p "$zsh_fpath"
fi
if has_shell fish; then mkdir -p ~/.config/fish/completions; fi
if has_shell bash; then mkdir -p ~/.local/share/bash-completion/completions; fi

# Wire up qsoku's shell integration (working-directory carry-back and
# completion) in each shell. Idempotent: skipped if already present, so
# re-running postCreate.sh does not duplicate the line. The single quotes are
# intentional -- the lines are meant to land in the rc files unexpanded.
for shell in "${shells[@]}"; do
  # shellcheck disable=SC2016
  case "$shell" in
    bash) grep -qF 'qsoku .shell bash' ~/.bashrc 2>/dev/null || echo 'eval "$(qsoku .shell bash)"' >>~/.bashrc ;;
    zsh) grep -qF 'qsoku .shell zsh' ~/.zshrc 2>/dev/null || echo 'eval "$(qsoku .shell zsh)"' >>~/.zshrc ;;
    fish) grep -qF 'qsoku .shell fish' ~/.config/fish/config.fish 2>/dev/null || echo 'qsoku .shell fish | source' >>~/.config/fish/config.fish ;;
    pwsh) grep -qF 'qsoku .shell pwsh' "$pwsh_profile" 2>/dev/null || echo 'Invoke-Expression (& qsoku .shell pwsh | Out-String)' >>"$pwsh_profile" ;;
    *)
      echo "error: unknown shell in shells: $shell (bash, zsh, fish or pwsh)" >&2
      exit 1
      ;;
  esac
done

# The completion of bcuz, crube, mtqg and srwr, for interactive use in this
# container, in each shell, at the places their documents name. bcuz prints it
# with --completion <shell> (it has no subcommands); the others with completion
# <shell>. They are installed @latest above, and a release older than its
# completion has none: then it only warns, and the next rebuild after a release
# picks it up. pwsh has no completions directory: the script is appended to
# $PROFILE once, found again by its Register-ArgumentCompleter line.
for tool in bcuz crube mtqg srwr; do
  if [ "$tool" = bcuz ]; then
    print_completion=(bcuz --completion)
  else
    print_completion=("$tool" completion)
  fi
  if ! "${print_completion[@]}" bash >/dev/null 2>&1; then
    echo "warning: no shell completion from this $tool (${print_completion[*]} bash failed); skipped" >&2
    continue
  fi
  for shell in "${shells[@]}"; do
    case "$shell" in
      bash) "${print_completion[@]}" bash >~/.local/share/bash-completion/completions/"$tool" ;;
      zsh) "${print_completion[@]}" zsh | sudo tee "$zsh_fpath/_$tool" >/dev/null ;;
      fish) "${print_completion[@]}" fish >~/.config/fish/completions/"$tool".fish ;;
      pwsh) grep -qF -e "-CommandName $tool -ScriptBlock" "$pwsh_profile" 2>/dev/null || "${print_completion[@]}" powershell >>"$pwsh_profile" ;;
    esac
  done
done

# npm dependencies for the extension itself, once package.json exists.
if [ -f package.json ]; then
  npm ci
fi
