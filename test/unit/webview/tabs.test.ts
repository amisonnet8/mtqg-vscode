import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TAB_IDS, TAB_LABELS, DEFAULT_TAB, isTabId } from '../../../src/webview/shared/tabs';

test('the six screens are in ui.md\'s table order', () => {
  assert.deepEqual(TAB_IDS, ['todos', 'questions', 'bugs', 'rules', 'glossary', 'memos']);
});

test('every tab has an English label from naming.md\'s term list', () => {
  for (const id of TAB_IDS) {
    assert.ok(TAB_LABELS[id]);
  }
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
