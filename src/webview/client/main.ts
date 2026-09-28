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
    closeMentionDropdown(); // the open dropdown's cell is about to be hidden
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

  // "@"-mention file typeahead, in every editable field at once (ui.md's
  // "机能を足さない" reading of this: the inserted path is plain text in the
  // record body, not a new field -- mtqg has no `--at` any more (v1.1.0) for
  // this to attach to). The file list itself arrives once via a `files`
  // message from panel.ts and is never re-fetched from here.
  let fileList: string[] = [];
  let mentionState: { cell: HTMLElement; matches: string[]; selectedIndex: number } | null = null;
  let mentionDropdown: HTMLElement | undefined;

  function getMentionDropdown(): HTMLElement {
    if (!mentionDropdown) {
      const dropdown = document.createElement('div');
      dropdown.className = 'mention-dropdown';
      dropdown.setAttribute('role', 'listbox');
      dropdown.hidden = true;
      // Keeps the contenteditable cell focused -- without this, the click's
      // focus change would fire the focusout handler below first, which
      // would submit the text while "@query" is still in it.
      dropdown.addEventListener('mousedown', (event) => event.preventDefault());
      dropdown.addEventListener('click', (event) => {
        const path = (event.target as HTMLElement).closest<HTMLElement>('.mention-item')?.dataset.path;
        if (path) {
          insertMention(path);
        }
      });
      document.body.appendChild(dropdown);
      mentionDropdown = dropdown;
    }
    return mentionDropdown;
  }

  function closeMentionDropdown(): void {
    mentionState = null;
    if (mentionDropdown) {
      mentionDropdown.hidden = true;
    }
  }

  /** basename-starts-with, then basename-contains, then full-path-contains. */
  function matchFiles(query: string): string[] {
    if (query === '') {
      return fileList.slice(0, 8);
    }
    const lower = query.toLowerCase();
    const startsWith: string[] = [];
    const contains: string[] = [];
    const pathContains: string[] = [];
    for (const path of fileList) {
      const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
      if (base.startsWith(lower)) {
        startsWith.push(path);
      } else if (base.includes(lower)) {
        contains.push(path);
      } else if (path.toLowerCase().includes(lower)) {
        pathContains.push(path);
      }
    }
    return [...startsWith, ...contains, ...pathContains].slice(0, 8);
  }

  function renderMentionDropdown(): void {
    if (!mentionState) {
      return;
    }
    const dropdown = getMentionDropdown();
    dropdown.innerHTML = '';
    if (mentionState.matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mention-empty';
      empty.textContent = 'No matching files';
      dropdown.appendChild(empty);
    } else {
      mentionState.matches.forEach((path, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = index === mentionState!.selectedIndex ? 'mention-item active' : 'mention-item';
        item.dataset.path = path;
        item.setAttribute('role', 'option');
        item.textContent = path;
        dropdown.appendChild(item);
      });
    }
    // Below the cell itself, not the caret -- every field this attaches to
    // is single-line, so the cell's own edge is precise enough.
    const rect = mentionState.cell.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.hidden = false;
  }

  /** Replaces the trailing "@query" (still in the text) with "@<path> ". */
  function insertMention(path: string): void {
    const cell = mentionState?.cell;
    if (!cell) {
      return;
    }
    const text = cell.textContent ?? '';
    const match = /(^|\s)@([^\s@]*)$/.exec(text);
    if (match) {
      cell.textContent = `${text.slice(0, match.index)}${match[1]}@${path} `;
    }
    closeMentionDropdown();
    cell.focus();
    // A single, always-append edit: editing a mention typed earlier in the
    // middle of the text is not supported, so the caret always goes to the
    // end rather than tracking where "@query" was.
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  document.addEventListener('input', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-field].editable');
    if (!cell) {
      return;
    }
    // Cursor-at-the-end assumption: only the trailing "@query" is detected,
    // so editing a mention already typed earlier in the text is out of
    // scope (see insertMention above).
    const match = /(^|\s)@([^\s@]*)$/.exec(cell.textContent ?? '');
    if (match) {
      mentionState = { cell, matches: matchFiles(match[2]), selectedIndex: 0 };
      renderMentionDropdown();
    } else if (mentionState?.cell === cell) {
      closeMentionDropdown();
    }
  });

  document.addEventListener('focusout', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (!cell) {
      return;
    }
    if (mentionState?.cell === cell) {
      // Real focus loss (a dropdown-item click never gets here: its
      // mousedown already prevented the blur). Close, but submit whatever
      // text -- including an unfinished "@query" -- is there, same as any
      // other focusout.
      closeMentionDropdown();
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
    if (mentionState && mentionState.cell === cell) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        mentionState.selectedIndex = Math.max(
          0,
          Math.min(mentionState.selectedIndex + delta, mentionState.matches.length - 1),
        );
        renderMentionDropdown();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMentionDropdown();
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && mentionState.matches.length > 0) {
        event.preventDefault();
        insertMention(mentionState.matches[mentionState.selectedIndex]);
        return;
      }
      // No matches, or some other key: close and fall through to the
      // normal handling below (e.g. Enter with no matches still submits).
      closeMentionDropdown();
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
    const message = event.data as { type?: string; tab?: string; html?: string; paths?: string[] };
    if (message?.type === 'files') {
      fileList = Array.isArray(message.paths) ? message.paths : [];
      return;
    }
    if (message?.type !== 'render' || !message.tab) {
      return;
    }
    const panel = document.getElementById(`panel-${message.tab}`);
    if (panel) {
      // The re-render is about to replace mentionState.cell's DOM node, so
      // any reference to it (and the dropdown pointing at it) would go stale.
      if (mentionState && panel.contains(mentionState.cell)) {
        closeMentionDropdown();
      }
      panel.innerHTML = message.html ?? '';
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
