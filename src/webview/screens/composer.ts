/**
 * Parses the Memo screen's one input field into a record to create (ui.md
 * "入力欄は普段はmemoとして投稿し、/todo・/qa・/bug・/rule・/glossaryのようなスラッシュ
 * コマンドで種類を書き分ける"). Pure and host-side (q&a `0736e37fd7`) so the
 * Webview's fixed script only ever forwards the raw text
 * (src/webview/client/main.ts) -- this is the one place that decides what a
 * slash command means.
 */
export type ComposerPost =
  | { kind: 'memo' | 'todo' | 'qa' | 'bug' | 'rule'; text: string }
  | { kind: 'glossary'; word: string; text: string };

export interface ComposerError {
  error: string;
}

// Ordered to match the tab bar (Memo/Todo/QA/Bugs/Rules/Glossary, q&a
// `70787501f3f3`) rather than the earlier, undocumented ordering -- the
// human asked whether that order had a real reason behind it; it did not
// (inherited verbatim from mtqg's own pre-Bugs/Rules design doc, q&a
// `112863a3fc43`), so this list follows the one order that does. One-letter
// aliases sit next to their full command; both map to the same kind, so
// parseComposer below never needs to know an alias was used.
const COMMAND_KINDS: Record<string, 'todo' | 'qa' | 'bug' | 'rule' | 'glossary'> = {
  '/todo': 'todo',
  '/t': 'todo',
  '/qa': 'qa',
  '/q': 'qa',
  '/bug': 'bug',
  '/b': 'bug',
  '/rule': 'rule',
  '/r': 'rule',
  '/glossary': 'glossary',
  '/g': 'glossary',
};

/**
 * Anything not starting with `/` is a memo. A leading word that starts with
 * `/` but does not exactly match a known command is rejected rather than
 * falling back to memo (q&a confirmed at todo `01ee2706ce`) -- silently
 * posting a mistyped `/qz ...` as a memo would bury the typo instead of
 * surfacing it.
 */
export function parseComposer(input: string): ComposerPost | ComposerError {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { kind: 'memo', text: trimmed };
  }

  const spaceIndex = trimmed.indexOf(' ');
  const command = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  const rest = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();
  const kind = COMMAND_KINDS[command];
  if (!kind) {
    return { error: `Unknown command: ${command}` };
  }

  if (kind === 'glossary') {
    // The first space splits word from definition (q&a `d8734c175cd2`): a
    // term containing a space cannot be written this way and needs the
    // Glossary screen instead.
    const wordSpace = rest.indexOf(' ');
    if (wordSpace === -1) {
      return { error: '/glossary needs a term and a definition' };
    }
    const word = rest.slice(0, wordSpace).trim();
    const text = rest.slice(wordSpace + 1).trim();
    if (!word || !text) {
      return { error: '/glossary needs a term and a definition' };
    }
    return { kind: 'glossary', word, text };
  }

  return { kind, text: rest };
}
