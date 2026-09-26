import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TAB_IDS, TAB_LABELS, DEFAULT_TAB, isTabId } from '../../../src/webview/shared/tabs';

test('the six screens are in Memo/Todo/QA/Bug/Rule/Glossary order (decision, q&a 70787501f3f3)', () => {
  assert.deepEqual(TAB_IDS, ['memos', 'todos', 'questions', 'bugs', 'rules', 'glossary']);
});

test('tab labels are Memo/Todo/QA/Bug/Rule/Glossary (singular, decision q&a a1daf7a25153)', () => {
  assert.deepEqual(TAB_LABELS, {
    memos: 'Memo',
    todos: 'Todo',
    questions: 'QA',
    bugs: 'Bug',
    rules: 'Rule',
    glossary: 'Glossary',
  });
});

test('the default tab is the first one', () => {
  assert.equal(DEFAULT_TAB, TAB_IDS[0]);
});

test('isTabId accepts only the six known ids', () => {
  for (const id of TAB_IDS) {
    assert.equal(isTabId(id), true);
  }
  assert.equal(isTabId('todo'), false);
  assert.equal(isTabId(''), false);
  assert.equal(isTabId(42), false);
  assert.equal(isTabId(undefined), false);
});
