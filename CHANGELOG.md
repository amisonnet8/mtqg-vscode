# Changelog

All notable changes to the mtqg VS Code extension are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - Unreleased

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
- **mtqg: New Record Here** command (also in the editor's right-click menu),
  creating a record at the file and line of the current selection or cursor
