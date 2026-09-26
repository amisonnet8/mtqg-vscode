import type { MtqgClient } from '../mtqg/client';
import { renderError, renderScreen, type ScreenView } from './screens';
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
  // "Show done"-style toggles (ui.md: default is open-only). Kept here, not
  // in mtqg, since it is a display preference, not a record (ui.md「機能は
  // 足さない」) -- resets to the default when the panel is reopened.
  const showAll = new Set<TabId>();
  // Which question threads are expanded (todo `8b7b600827`), same reasoning
  // as showAll: a display state, not something mtqg records.
  const expanded = new Map<TabId, Set<string>>();

  function viewFor(tab: TabId): ScreenView {
    return { all: showAll.has(tab), expanded: expanded.get(tab) };
  }

  /** Which mtqg calls `setStatus` maps to, per tab (todo `13570d152b`: a
   * plain lookup scales better than a growing ternary as more tabs gain a
   * done/reopen pair). */
  const statusActions: Partial<Record<TabId, { done: (id: string) => Promise<unknown>; reopen: (id: string) => Promise<unknown> }>> = {
    todos: { done: client.todoDone, reopen: client.todoReopen },
    questions: { done: client.qaDone, reopen: client.qaReopen },
    bugs: { done: client.bugDone, reopen: client.bugReopen },
  };

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
    renderWith(tab, () => renderScreen(tab, client, viewFor(tab)));
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
        .then(() => renderScreen(tab, client, viewFor(tab)))
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
      case 'addTodo':
        runWrite(message.tab, () => client.todoAdd(message.text));
        return;
      case 'addQuestion':
        runWrite(message.tab, () => client.qaAsk(message.text));
        return;
      case 'addAnswer':
        runWrite(message.tab, () => client.qaAnswer(message.id, message.text));
        return;
      case 'addBug':
        runWrite(message.tab, () => client.bugReport(message.text));
        return;
      case 'addBugReply':
        runWrite(message.tab, () => client.bugReply(message.id, message.text));
        return;
      case 'editRecord':
        runWrite(message.tab, () => client.edit(message.id, message.text));
        return;
      case 'deleteRecord':
        runWrite(message.tab, () => client.delete(message.id));
        return;
      case 'setStatus': {
        const actions = statusActions[message.tab];
        if (!actions) {
          return;
        }
        runWrite(message.tab, () => (message.done ? actions.done(message.id) : actions.reopen(message.id)));
        return;
      }
      case 'setShowAll':
        if (message.all) {
          showAll.add(message.tab);
        } else {
          showAll.delete(message.tab);
        }
        render(message.tab);
        return;
      case 'toggleExpand': {
        const tabExpanded = expanded.get(message.tab) ?? new Set<string>();
        if (message.expanded) {
          tabExpanded.add(message.id);
        } else {
          tabExpanded.delete(message.id);
        }
        expanded.set(message.tab, tabExpanded);
        render(message.tab);
        return;
      }
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
