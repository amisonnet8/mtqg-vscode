import { isTabId, type TabId } from './tabs';

/**
 * Sent by the Webview's fixed client script (src/webview/client/main.ts).
 * `editRecord`/`deleteRecord` are kind-independent, mirroring mtqg's own
 * `edit`/`delete` commands (docs/reference/cli.md "edit, delete") which work
 * the same way regardless of record kind -- future screens (ToDo/QA/Bugs)
 * reuse these two as-is. `addRule`/`addGlossary` are kind-specific because
 * their `add` commands take different arguments.
 */
export type WebviewMessage =
  | { type: 'ready'; tab: TabId }
  | { type: 'selectTab'; tab: TabId }
  | { type: 'addRule'; tab: TabId; text: string }
  | { type: 'addGlossary'; tab: TabId; word: string; text: string }
  | { type: 'addTodo'; tab: TabId; text: string }
  | { type: 'addQuestion'; tab: TabId; text: string }
  | { type: 'addAnswer'; tab: TabId; id: string; text: string }
  | { type: 'editRecord'; tab: TabId; id: string; text: string }
  | { type: 'deleteRecord'; tab: TabId; id: string }
  // Kind-independent, mirroring editRecord/deleteRecord above: QA/Bugs
  // (todo `8b7b600827`/`13570d152b`) reuse this for their own done/reopen.
  | { type: 'setStatus'; tab: TabId; id: string; done: boolean }
  | { type: 'setShowAll'; tab: TabId; all: boolean }
  // Display-only state (todo `8b7b600827`): which question's reply thread
  // is open. Not a record, so it never reaches mtqg.
  | { type: 'toggleExpand'; tab: TabId; id: string; expanded: boolean };

/** Sent by the host (src/webview/controller.ts) to the Webview. */
export interface HostMessage {
  type: 'render';
  tab: TabId;
  html: string;
}

/**
 * A message from the Webview crosses a process boundary (postMessage), so
 * it is untrusted input: parse it defensively rather than trusting its
 * shape. Anything that does not match a known message is dropped. Only the
 * shape is checked here (e.g. that `text` is a string) -- whether it is
 * blank is left to the same guard the CLI layer already applies
 * (src/mtqg/client.ts `requireText`), so there is exactly one place that
 * decides what counts as empty.
 */
export function parseWebviewMessage(value: unknown): WebviewMessage | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { type, tab, id, word, text, done, all, expanded } = value as Record<string, unknown>;
  if (!isTabId(tab)) {
    return undefined;
  }

  if (type === 'ready' || type === 'selectTab') {
    return { type, tab };
  }
  if (type === 'addRule' && typeof text === 'string') {
    return { type, tab, text };
  }
  if (type === 'addGlossary' && typeof word === 'string' && typeof text === 'string') {
    return { type, tab, word, text };
  }
  if (type === 'addTodo' && typeof text === 'string') {
    return { type, tab, text };
  }
  if (type === 'addQuestion' && typeof text === 'string') {
    return { type, tab, text };
  }
  if (type === 'addAnswer' && typeof id === 'string' && typeof text === 'string') {
    return { type, tab, id, text };
  }
  if (type === 'editRecord' && typeof id === 'string' && typeof text === 'string') {
    return { type, tab, id, text };
  }
  if (type === 'deleteRecord' && typeof id === 'string') {
    return { type, tab, id };
  }
  if (type === 'setStatus' && typeof id === 'string' && typeof done === 'boolean') {
    return { type, tab, id, done };
  }
  if (type === 'setShowAll' && typeof all === 'boolean') {
    return { type, tab, all };
  }
  if (type === 'toggleExpand' && typeof id === 'string' && typeof expanded === 'boolean') {
    return { type, tab, id, expanded };
  }
  return undefined;
}
