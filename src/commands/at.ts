import * as path from 'node:path';
import type { AtInfo } from '../mtqg/types';

/** The part of `vscode.Selection` this needs -- kept as a plain shape (not
 * `vscode.Selection` itself) so this stays vscode-independent and testable
 * with `node:test` (`.claude/rules/testing.md` "ロジックをVSCode APIから切り
 * 離してテストできる形にする"). `vscode.Position.line` is 0-based; pass it
 * straight through. */
export interface Selection {
  startLine: number;
  endLine: number;
}

/**
 * Builds the `AtInfo` a `--at <path>[:<line>]` call needs, from the editor's
 * current selection/cursor position (todo `24f2e871d5`).
 *
 * A multi-line selection collapses to its first line -- `--at` only ever
 * holds one line, and mtqg's own parser (`internal/cli/at.go`) expects a
 * single 1-based line number, not a range. `Math.min` makes this the same
 * regardless of whether the selection was dragged downward or upward
 * (`vscode.Selection.start`/`.end` are already ordered this way, but taking
 * the min again here keeps this function correct for any caller).
 *
 * `head` (the commit hash) is never set here: mtqg fills it in itself and
 * has no option to accept one from the caller (`/home/node/mtqg-cli-response.md`
 * "head…呼び出し側から指定するオプションはありません").
 *
 * `path.relative`, not `vscode.workspace.asRelativePath`, so this stays pure.
 * mtqg does not normalize or validate the path it is given (same source,
 * "パスは渡されたとおりに記録されます") -- a file outside `workspaceRoot`
 * yields a `../`-prefixed path, which is accepted as-is rather than blocked.
 *
 * `path.relative`'s own separator is the OS native one (`\` on Windows), but
 * mtqg records paths as-is with no normalization of its own -- a record
 * made on Windows would otherwise carry backslashes forever. Converting to
 * `/` here keeps every record's path in the one form mtqg's own paths
 * already use (found via CI's Windows leg, bug `d9edda4615d9`).
 */
export function computeAt(workspaceRoot: string, filePath: string, selection: Selection): AtInfo {
  const relativePath = path.relative(workspaceRoot, filePath) || path.basename(filePath);
  const posixPath = relativePath.split(path.sep).join('/');
  const line = Math.min(selection.startLine, selection.endLine) + 1;
  return { path: posixPath, line };
}
