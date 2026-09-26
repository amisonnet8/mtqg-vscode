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
    } else if (tab === 'questions') {
      if (value === '') {
        return;
      }
      // A per-question reply field (`.add-row` nested inside that
      // question's detail row, todo `8b7b600827`) carries the question's
      // id via `data-question-id` -- distinct from `data-id`, which would
      // otherwise route this into the "editing an existing record" branch
      // above instead of adding a new reply.
      const questionId = row.dataset.questionId;
      if (questionId) {
        vscode.postMessage({ type: 'addAnswer', tab, id: questionId, text: value });
      } else {
        vscode.postMessage({ type: 'addQuestion', tab, text: value });
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
      vscode.postMessage({ type: 'setStatus', tab, id, done });
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
