import type { MtqgClient } from '../mtqg/client';
import { renderScreen } from './screens';
import { type HostMessage, parseWebviewMessage } from './shared/messages';
import { DEFAULT_TAB, type TabId } from './shared/tabs';

export interface PanelController {
  handleMessage(message: unknown): void;
  /** `.mtqg/journal.jsonl` changed (mtqg-cli.md: never read its contents here, only re-run mtqg). */
  journalChanged(): void;
  dispose(): void;
}

export interface PanelControllerOptions {
  client: MtqgClient;
  post: (message: HostMessage) => void;
  /** How long to wait for a burst of journal changes to settle before re-rendering. */
  debounceMs?: number;
}

/**
 * The Webview-independent half of panel.ts: decides what to render and
 * when, given messages from the Webview and journal-change notifications.
 * Kept free of `vscode` so it can be unit-tested with a real mtqg binary
 * (test/unit/webview/controller.test.ts) rather than only inside the
 * extension development host.
 */
export function createPanelController(options: PanelControllerOptions): PanelController {
  const { client, post } = options;
  const debounceMs = options.debounceMs ?? 100;

  let activeTab: TabId = DEFAULT_TAB;
  let generation = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function render(tab: TabId): void {
    const thisGeneration = ++generation;
    void renderScreen(tab, client).then((html) => {
      // A later render (a tab switch, or another journal change) has
      // already started: this result is stale, so drop it rather than
      // risk overwriting a newer one that finished first.
      if (thisGeneration !== generation) {
        return;
      }
      post({ type: 'render', tab, html });
    });
  }

  return {
    handleMessage(message: unknown) {
      const parsed = parseWebviewMessage(message);
      if (!parsed) {
        return;
      }
      activeTab = parsed.tab;
      render(activeTab);
    },
    journalChanged() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        render(activeTab);
      }, debounceMs);
    },
    dispose() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
    },
  };
}
