import type { MtqgClient } from '../mtqg/client';
import { escapeHtml } from './shared/escape';
import { TAB_LABELS, type TabId } from './shared/tabs';

/**
 * Renders one tabpanel's inner content. Each screen's own layout is decided
 * with the human right before that screen's todo starts (ui.md "未決事項",
 * todo `9985245ed8`) -- until then, every tab shows the same placeholder,
 * whose only job is to prove the plumbing works: call mtqg (`status`) and
 * show its own error message verbatim if that fails
 * (.claude/rules/mtqg-cli.md "messageは人間に見せる文言としてそのまま使ってよい").
 */
export async function renderScreen(tab: TabId, client: MtqgClient): Promise<string> {
  try {
    await client.status();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `<p class="error">${escapeHtml(message)}</p>`;
  }
  return `<p class="placeholder">${escapeHtml(TAB_LABELS[tab])}: coming soon.</p>`;
}
