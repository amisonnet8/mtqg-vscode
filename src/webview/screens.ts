import type { MtqgClient } from '../mtqg/client';
import { renderGlossary } from './screens/glossary';
import { renderRules } from './screens/rules';
import { escapeHtml } from './shared/escape';
import { TAB_LABELS, type TabId } from './shared/tabs';

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
 * Renders one tabpanel's inner content. Each screen's own layout is decided
 * with the human right before that screen's todo starts (ui.md "未決事項",
 * todo `9985245ed8`). Rules and Glossary are built (todo `daf43fc83d`); the
 * rest still show a placeholder that only proves mtqg is reachable.
 */
export async function renderScreen(tab: TabId, client: MtqgClient): Promise<string> {
  try {
    switch (tab) {
      case 'rules':
        return renderRules((await client.ruleList()).data.records);
      case 'glossary':
        return renderGlossary((await client.glossaryList()).data.records);
      default:
        await client.status();
        return `<p class="placeholder">${escapeHtml(TAB_LABELS[tab])}: coming soon.</p>`;
    }
  } catch (err) {
    return renderError(err instanceof Error ? err.message : String(err));
  }
}
