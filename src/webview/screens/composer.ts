/**
 * Parses the Memo screen's one input field into a record to create (ui.md
 * "入力欄は普段はmemoとして投稿し、/todo・/qa・/bug・/glossary・/ruleのようなスラッシュ
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

const COMMAND_KINDS: Record<string, 'todo' | 'qa' | 'bug' | 'rule' | 'glossary'> = {
  '/todo': 'todo',
  '/qa': 'qa',
  '/bug': 'bug',
  '/rule': 'rule',
  '/glossary': 'glossary',
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
