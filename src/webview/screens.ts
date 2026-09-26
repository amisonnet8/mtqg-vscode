import type { MtqgClient } from '../mtqg/client';
import { renderBugs } from './screens/bugs';
import { renderGlossary } from './screens/glossary';
import { renderMemos } from './screens/memos';
import { renderQuestions } from './screens/questions';
import { renderRules } from './screens/rules';
import { renderTodos } from './screens/todos';
import { escapeHtml } from './shared/escape';
import { TAB_LABELS, type TabId } from './shared/tabs';

/** Per-tab display options that are not part of the record data itself
 * (e.g. the "Show done"/"Show answered" toggle, which question threads are
 * expanded) -- kept by the controller, not mtqg. */
export interface ScreenView {
  all?: boolean;
  expanded?: Set<string>;
  /** Memo screen only (todo `01ee2706ce`): how many of the newest records to
   * fetch, and the composer/undo notice line. */
  memoLimit?: number;
  notice?: string;
  autoscroll?: boolean;
}

/**
 * An mtqg error shown verbatim (.claude/rules/mtqg-cli.md
 * "messageは人間に見せる文言としてそのまま使ってよい"). Exported so
 * src/webview/controller.ts can render the same way when a write action
 * (add/edit/delete) fails, not only when a read does.
 */
export function renderError(message: string): string {
  return `<p class="error">${escapeHtml(message)}</p>`;
}

/**
 * Renders one tabpanel's inner content. Each screen's own layout was decided
 * with the human right before that screen's todo started (ui.md "未決事項",
 * todo `9985245ed8`). All six screens are now built; `default` is unreachable
 * but kept as a defensive fallback if `TabId` ever grows a new value.
 */
export async function renderScreen(tab: TabId, client: MtqgClient, view: ScreenView = {}): Promise<string> {
  try {
    switch (tab) {
      case 'rules':
        return renderRules((await client.ruleList()).data.records);
      case 'glossary':
        return renderGlossary((await client.glossaryList()).data.records);
      case 'todos':
        return renderTodos((await client.todoList({ all: true })).data.records, { all: view.all });
      case 'questions':
        return renderQuestions((await client.qaList({ all: true })).data.records, {
          all: view.all,
          expanded: view.expanded,
        });
      case 'bugs':
        return renderBugs((await client.bugList({ all: true })).data.records, {
          all: view.all,
          expanded: view.expanded,
        });
      case 'memos': {
        const result = await client.log({ limit: view.memoLimit ?? 50, events: true });
        return renderMemos(result.data.records, {
          hasEarlier: result.data.shown < result.data.total,
          notice: view.notice,
          autoscroll: view.autoscroll,
        });
      }
      default:
        await client.status();
        return `<p class="placeholder">${escapeHtml(TAB_LABELS[tab])}: coming soon.</p>`;
    }
  } catch (err) {
    return renderError(err instanceof Error ? err.message : String(err));
  }
}
