# mtqg for VS Code

> **Work in progress. Not ready to use yet.**
> [mtqg](https://github.com/amisonnet8/mtqg) itself has no released version
> yet, and its data format and commands may change without notice. This
> extension follows the same status: expect breaking changes before a v1.

A VS Code extension for [mtqg](https://github.com/amisonnet8/mtqg), a CLI
that records memos, todos, questions & bugs, rules, and glossary terms
(**m**emo & rules, **t**odo, **q**a & bugs, **g**lossary) as an append-only
journal (`.mtqg/journal.jsonl`) in a git repository. This extension assists
with creating those records and shows their state and history from inside
the editor -- it does not add any new kind of data or operation. All reading
and writing goes through the `mtqg` CLI (invoked with `--json`); nothing in
`.mtqg/` is read or written directly.

## Requirements

- `mtqg` 1.0.0 or later on your `PATH` (see the
  [mtqg repository](https://github.com/amisonnet8/mtqg) for installation)
- A workspace folder that is a git repository initialized with `mtqg init`

## Features

Run **mtqg: Open** to open the mtqg panel, a chat-like view of your
project's journal with six tabs:

| Tab | Shows |
|---|---|
| Memo | A timeline of every record (Slack/Discord-style), newest at the bottom |
| Todo | Cards with checkboxes; check one off to mark it done |
| QA | Questions and their answers, as threads |
| Bug | Bugs and their replies, as threads |
| Rule | Adopted rules |
| Glossary | Defined terms |

The Memo tab's input field posts a memo by default. Prefix it with a slash
command to record something else instead: `/todo`, `/qa`, `/bug`, `/rule`,
`/glossary` (or the one-letter aliases `/t`, `/q`, `/b`, `/r`, `/g`).
Editing and deleting a record leaves a visible trace rather than silently
rewriting or hiding it, and every write can be undone right after it's made.

**mtqg: New Record Here** (also in the editor's right-click menu) creates a
record at the file and line of your current selection or cursor, so a memo,
todo, question, bug, rule, or glossary entry can point back to the exact
code it's about.

## Commands

| Command | Title |
|---|---|
| `mtqg.open` | mtqg: Open |
| `mtqg.createAt` | mtqg: New Record Here |

## License

MIT
