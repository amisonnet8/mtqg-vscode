/**
 * The six screens (ui.md), and nothing beyond them (ui.md "機能は足さない").
 * Order and labels follow ui.md's table and naming.md's term list.
 */
export const TAB_IDS = ['todos', 'questions', 'bugs', 'rules', 'glossary', 'memos'] as const;

export type TabId = (typeof TAB_IDS)[number];

export const TAB_LABELS: Record<TabId, string> = {
  todos: 'Todos',
  questions: 'Questions',
  bugs: 'Bugs',
  rules: 'Rules',
  glossary: 'Glossary',
  memos: 'Memos',
};

export const DEFAULT_TAB: TabId = TAB_IDS[0];

export function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && (TAB_IDS as readonly string[]).includes(value);
}
