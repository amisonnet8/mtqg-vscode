/**
 * The six screens (ui.md), and nothing beyond them (ui.md "機能は足さない").
 * Order and labels changed from ui.md's original table/naming.md's plural
 * forms to Memo/Todo/QA/Bugs/Rules/Glossary at the human's request (decision,
 * 2026-09-26, q&a `70787501f3f3` -- supersedes q&a `25f60225e5`).
 */
export const TAB_IDS = ['memos', 'todos', 'questions', 'bugs', 'rules', 'glossary'] as const;

export type TabId = (typeof TAB_IDS)[number];

export const TAB_LABELS: Record<TabId, string> = {
  memos: 'Memo',
  todos: 'Todo',
  questions: 'QA',
  bugs: 'Bugs',
  rules: 'Rules',
  glossary: 'Glossary',
};

export const DEFAULT_TAB: TabId = TAB_IDS[0];

export function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && (TAB_IDS as readonly string[]).includes(value);
}
