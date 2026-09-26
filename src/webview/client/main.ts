/**
 * The one script that runs inside the Webview. Deliberately tiny and fixed:
 * all real logic (what to show, when to re-fetch) lives on the host and is
 * unit-tested there (q&a `0736e37fd7`). This file has no imports -- it is
 * compiled on its own (src/webview/client/tsconfig.json) and loaded as a
 * plain `<script src>` from the HTML the host builds (src/webview/shared/html.ts).
 *
 * declare, not import: this file is never bundled with `vscode`'s ambient
 * types, so the Webview API's own global constructor needs its own minimal
 * shape here.
 */
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

(function main() {
  const vscode = acquireVsCodeApi();

  function activeTabFromState(): string | undefined {
    const state = vscode.getState();
    return typeof state === 'object' && state !== null && 'tab' in state
      ? String((state as { tab: unknown }).tab)
      : undefined;
  }

  function selectTab(tab: string): void {
    for (const tabButton of document.querySelectorAll<HTMLElement>('[role="tab"]')) {
      tabButton.setAttribute('aria-selected', String(tabButton.dataset.tab === tab));
    }
    for (const panel of document.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
      panel.hidden = panel.dataset.tab !== tab;
    }
    vscode.setState({ tab });
  }

  document.querySelector('[role="tablist"]')?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    const tab = button?.dataset.tab;
    if (!tab) {
      return;
    }
    selectTab(tab);
    vscode.postMessage({ type: 'selectTab', tab });
  });

  window.addEventListener('message', (event) => {
    const message = event.data as { type?: string; tab?: string; html?: string };
    if (message?.type !== 'render' || !message.tab) {
      return;
    }
    const panel = document.getElementById(`panel-${message.tab}`);
    if (panel) {
      panel.innerHTML = message.html ?? '';
    }
  });

  const initialTab = activeTabFromState();
  if (initialTab) {
    selectTab(initialTab);
  }
  const currentTab = document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.dataset.tab;
  if (currentTab) {
    vscode.postMessage({ type: 'ready', tab: currentTab });
  }
})();
