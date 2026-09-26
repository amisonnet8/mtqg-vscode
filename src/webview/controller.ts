import type { MtqgClient } from '../mtqg/client';
import { renderError, renderScreen } from './screens';
import { type HostMessage, parseWebviewMessage, type WebviewMessage } from './shared/messages';
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

  /** Runs `supplier`, then posts its HTML to `tab` unless a later render has since started. */
  function renderWith(tab: TabId, supplier: () => Promise<string>): void {
    const thisGeneration = ++generation;
    void supplier().then((html) => {
      // A later render (a tab switch, another write, or a journal change)
      // has already started: this result is stale, so drop it rather than
      // risk overwriting a newer one that finished first.
      if (thisGeneration !== generation) {
        return;
      }
      post({ type: 'render', tab, html });
    });
  }

  function render(tab: TabId): void {
    renderWith(tab, () => renderScreen(tab, client));
  }

  /**
   * Runs a write (add/edit/delete), then re-renders `tab` from mtqg's own
   * new state -- never by patching the DOM with what the Webview guessed
   * would happen. A failure renders mtqg's own message in place of the
   * table (screens.ts `renderError`), the same way a read failure does.
   */
  function runWrite(tab: TabId, action: () => Promise<unknown>): void {
    renderWith(tab, () =>
      action()
        .then(() => renderScreen(tab, client))
        .catch((err) => renderError(err instanceof Error ? err.message : String(err))),
    );
  }

  function handleWebviewMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'ready':
      case 'selectTab':
        activeTab = message.tab;
        render(activeTab);
        return;
      case 'addRule':
        runWrite(message.tab, () => client.ruleAdd(message.text));
        return;
      case 'addGlossary':
        runWrite(message.tab, () => client.glossaryAdd(message.word, message.text));
        return;
      case 'editRecord':
        runWrite(message.tab, () => client.edit(message.id, message.text));
        return;
      case 'deleteRecord':
        runWrite(message.tab, () => client.delete(message.id));
        return;
    }
  }

  return {
    handleMessage(message: unknown) {
      const parsed = parseWebviewMessage(message);
      if (!parsed) {
        return;
      }
      handleWebviewMessage(parsed);
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
