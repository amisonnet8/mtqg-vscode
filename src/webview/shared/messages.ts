import { isTabId, type TabId } from './tabs';

/** Sent by the Webview's fixed client script (src/webview/client/main.ts). */
export type WebviewMessage = { type: 'ready'; tab: TabId } | { type: 'selectTab'; tab: TabId };

/** Sent by the host (src/webview/controller.ts) to the Webview. */
export interface HostMessage {
  type: 'render';
  tab: TabId;
  html: string;
}

/**
 * A message from the Webview crosses a process boundary (postMessage), so
 * it is untrusted input: parse it defensively rather than trusting its
 * shape. Anything that does not match a known message is dropped.
 */
export function parseWebviewMessage(value: unknown): WebviewMessage | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { type, tab } = value as { type?: unknown; tab?: unknown };
  if (!isTabId(tab)) {
    return undefined;
  }
  if (type === 'ready' || type === 'selectTab') {
    return { type, tab };
  }
  return undefined;
}
