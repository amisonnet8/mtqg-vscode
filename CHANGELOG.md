# Changelog

All notable changes to the mtqg VS Code extension are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-10-12

Requires `mtqg` 1.0.0 or later (unchanged).

### Added

- The panel is restored when VS Code restarts with it open, on the screen
  that was selected
- Every record shows its 10-digit short ID; press it to copy the full ID

### Changed

- Todo, QA, Bug, Rule and Glossary list oldest first, like the Memo
  timeline, with the input field pinned at the bottom of the screen
- A screen follows the newest record only when you are already at the
  bottom, or just opened the tab or added a record yourself; scrolled up,
  you keep your place

### Fixed

- Undo no longer reverts a record written by an AI agent over MCP: the
  extension now writes with its own per-workspace terminal identity
  (`MTQG_TTY`), so Undo only reverts what the extension wrote

## [1.0.0] - 2026-09-28

Initial release. Requires `mtqg` 1.0.0 or later.

### Added

- **mtqg: Open** command, opening a panel with six tabs: Memo, Todo, QA,
  Bug, Rule, Glossary
- Memo tab: a chat-like timeline of every record, with slash commands
  (`/todo`, `/qa`, `/bug`, `/rule`, `/glossary`, and one-letter aliases) to
  record something other than a memo
- Todo tab: Google Keep-style cards with a checkbox for done/reopen
- QA and Bug tabs: threaded questions/bugs with answers/replies
- Rule and Glossary tabs: plain tables
- Editing and deleting a record leaves a visible trace, with undo right
  after a write
- Type `@` in any input field to insert a workspace file's path into the
  record's text, with a searchable dropdown of matches
