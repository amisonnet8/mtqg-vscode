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

  /**
   * Replaces a rendered date element's UTC fallback text (`table.ts`'s
   * `dateSpan`, `data-iso`) with the viewer's own local time -- the actual
   * point of doing this here rather than on the host (bug `062ae1c25e`: the
   * extension host's own timezone is not necessarily this window's).
   * Deliberately the same numeric "YYYY-MM-DD HH:MM" shape as the fallback,
   * not a locale-formatted string, so the display stays consistent
   * regardless of the viewer's OS locale.
   */
  function localizeDates(root: ParentNode): void {
    for (const element of root.querySelectorAll<HTMLElement>('[data-iso]')) {
      const iso = element.dataset.iso;
      if (!iso) {
        continue;
      }
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      element.textContent = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours(),
      )}:${pad(date.getMinutes())}`;
    }
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

  // Generic table/card interactions (Rules/Glossary/ToDo, and any future
  // screen that follows the same data-field/data-id/data-action
  // convention -- this script does not otherwise know what a screen looks
  // like, q&a `0736e37fd7`).

  function tabOf(element: HTMLElement): string | undefined {
    return element.closest<HTMLElement>('[role="tabpanel"]')?.dataset.tab;
  }

  document.addEventListener('focusout', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (!cell) {
      return;
    }
    const tab = tabOf(cell);
    // A table row (Rules/Glossary) or a card (ToDo) for an existing
    // record, or the always-present add row/field (no id yet) for either.
    const row = cell.closest<HTMLElement>('[data-id], .add-row');
    if (!tab || !row) {
      return;
    }
    const value = (cell.textContent ?? '').trim();
    const id = row.dataset.id;

    if (id) {
      // Editing an existing record's text (mtqg `edit`, kind-independent).
      const original = cell.dataset.original ?? '';
      if (value === '') {
        cell.textContent = original;
        return;
      }
      if (value === original) {
        return;
      }
      vscode.postMessage({ type: 'editRecord', tab, id, text: value });
      return;
    }

    // The always-present "add" row (no id yet).
    if (tab === 'rules') {
      if (value === '') {
        return;
      }
      vscode.postMessage({ type: 'addRule', tab, text: value });
    } else if (tab === 'glossary') {
      const word = row.querySelector<HTMLElement>('[data-field="word"]')?.textContent?.trim() ?? '';
      const text = row.querySelector<HTMLElement>('[data-field="text"]')?.textContent?.trim() ?? '';
      if (!word || !text) {
        return; // wait until both cells of the new entry are filled
      }
      vscode.postMessage({ type: 'addGlossary', tab, word, text });
    } else if (tab === 'todos') {
      if (value === '') {
        return;
      }
      vscode.postMessage({ type: 'addTodo', tab, text: value });
    } else if (tab === 'memos') {
      if (value === '') {
        return;
      }
      vscode.postMessage({ type: 'compose', tab, text: value });
    } else if (tab === 'questions' || tab === 'bugs') {
      if (value === '') {
        return;
      }
      // A per-item reply field (`.add-row` nested inside that item's detail
      // row, todo `8b7b600827`/`13570d152b`, shared by QA and Bugs via
      // screens/thread.ts) carries the parent's id via `data-parent-id` --
      // distinct from `data-id`, which would otherwise route this into the
      // "editing an existing record" branch above instead of adding a new
      // reply.
      const parentId = row.dataset.parentId;
      if (parentId) {
        vscode.postMessage(
          tab === 'questions'
            ? { type: 'addAnswer', tab, id: parentId, text: value }
            : { type: 'addBugReply', tab, id: parentId, text: value },
        );
      } else {
        vscode.postMessage(tab === 'questions' ? { type: 'addQuestion', tab, text: value } : { type: 'addBug', tab, text: value });
      }
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    const tab = tabOf(target);
    if (!tab) {
      return;
    }
    if (target.matches('[data-action="toggle-status"]')) {
      const id = target.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (!id) {
        return;
      }
      const done = (target as HTMLInputElement).checked;
      const kind = target.dataset.kind;
      vscode.postMessage(kind ? { type: 'setStatus', tab, id, done, kind } : { type: 'setStatus', tab, id, done });
    } else if (target.matches('[data-action="show-all"]')) {
      const all = (target as HTMLInputElement).checked;
      vscode.postMessage({ type: 'setShowAll', tab, all });
    }
  });

  document.addEventListener('keydown', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (!cell) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault(); // contenteditable's default is a line break
      cell.blur();
    } else if (event.key === 'Escape') {
      cell.textContent = cell.dataset.original ?? '';
      cell.blur();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const deleteButton = target.closest<HTMLElement>('[data-action="delete"]');
    if (deleteButton) {
      const tab = tabOf(deleteButton);
      const id = deleteButton.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (tab && id) {
        vscode.postMessage({ type: 'deleteRecord', tab, id });
      }
      return;
    }

    const expandButton = target.closest<HTMLElement>('[data-action="toggle-expand"]');
    if (expandButton) {
      const tab = tabOf(expandButton);
      const id = expandButton.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (tab && id) {
        const expanded = expandButton.getAttribute('aria-expanded') !== 'true';
        vscode.postMessage({ type: 'toggleExpand', tab, id, expanded });
      }
      return;
    }

    const loadEarlierButton = target.closest<HTMLElement>('[data-action="load-earlier"]');
    if (loadEarlierButton) {
      const tab = tabOf(loadEarlierButton);
      if (tab) {
        vscode.postMessage({ type: 'loadEarlier', tab });
      }
      return;
    }

    const undoButton = target.closest<HTMLElement>('[data-action="undo"]');
    if (undoButton) {
      const tab = tabOf(undoButton);
      if (tab) {
        vscode.postMessage({ type: 'undo', tab });
      }
      return;
    }

    // Copies the record's own id (q&a `414d6889d172`). Unlike every other
    // action here, this never touches mtqg, so it is handled entirely in
    // this script -- no `vscode.postMessage` round trip to the host.
    const copyIdButton = target.closest<HTMLElement>('[data-action="copy-id"]');
    if (copyIdButton) {
      const id = copyIdButton.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (!id) {
        return;
      }
      navigator.clipboard.writeText(id).then(() => {
        const original = copyIdButton.textContent;
        copyIdButton.textContent = '✓';
        copyIdButton.classList.add('copied');
        setTimeout(() => {
          copyIdButton.textContent = original;
          copyIdButton.classList.remove('copied');
        }, 1200);
      });
    }
  });

  window.addEventListener('message', (event) => {
    const message = event.data as { type?: string; tab?: string; html?: string };
    if (message?.type !== 'render' || !message.tab) {
      return;
    }
    const panel = document.getElementById(`panel-${message.tab}`);
    if (panel) {
      panel.innerHTML = message.html ?? '';
      localizeDates(panel);
      // Memo screen only (todo `01ee2706ce`): scroll the composer (at the
      // timeline's newest end) into view, unless this render is a "Load
      // earlier" (the host omits the attribute then, so the just-prepended
      // older posts are not immediately scrolled away).
      panel.querySelector<HTMLElement>('[data-autoscroll]')?.scrollIntoView({ block: 'end' });
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
