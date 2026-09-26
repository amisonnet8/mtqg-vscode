import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWebviewMessage } from '../../../src/webview/shared/messages';

test('parseWebviewMessage accepts a well-formed ready message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'ready', tab: 'todos' }), { type: 'ready', tab: 'todos' });
});

test('parseWebviewMessage accepts a well-formed selectTab message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'selectTab', tab: 'bugs' }), { type: 'selectTab', tab: 'bugs' });
});

test('parseWebviewMessage rejects an unknown type', () => {
  assert.equal(parseWebviewMessage({ type: 'somethingElse', tab: 'todos' }), undefined);
});

test('parseWebviewMessage rejects an unknown tab id', () => {
  assert.equal(parseWebviewMessage({ type: 'ready', tab: 'not-a-tab' }), undefined);
});

test('parseWebviewMessage rejects non-object input', () => {
  assert.equal(parseWebviewMessage('ready'), undefined);
  assert.equal(parseWebviewMessage(null), undefined);
  assert.equal(parseWebviewMessage(undefined), undefined);
  assert.equal(parseWebviewMessage(42), undefined);
});

test('parseWebviewMessage rejects an object missing a tab', () => {
  assert.equal(parseWebviewMessage({ type: 'ready' }), undefined);
});

test('parseWebviewMessage accepts a well-formed addRule message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addRule', tab: 'rules', text: 'Write in English' }), {
    type: 'addRule',
    tab: 'rules',
    text: 'Write in English',
  });
});

test('parseWebviewMessage rejects addRule without text, or with a non-string text', () => {
  assert.equal(parseWebviewMessage({ type: 'addRule', tab: 'rules' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addRule', tab: 'rules', text: 1 }), undefined);
});

test('parseWebviewMessage accepts a well-formed addGlossary message', () => {
  assert.deepEqual(
    parseWebviewMessage({ type: 'addGlossary', tab: 'glossary', word: 'token', text: 'a lexical unit' }),
    { type: 'addGlossary', tab: 'glossary', word: 'token', text: 'a lexical unit' },
  );
});

test('parseWebviewMessage rejects addGlossary missing word or text', () => {
  assert.equal(parseWebviewMessage({ type: 'addGlossary', tab: 'glossary', text: 'a lexical unit' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addGlossary', tab: 'glossary', word: 'token' }), undefined);
});

test('parseWebviewMessage accepts a well-formed editRecord message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'editRecord', tab: 'rules', id: 'abc123', text: 'new text' }), {
    type: 'editRecord',
    tab: 'rules',
    id: 'abc123',
    text: 'new text',
  });
});

test('parseWebviewMessage rejects editRecord missing id or text', () => {
  assert.equal(parseWebviewMessage({ type: 'editRecord', tab: 'rules', text: 'new text' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'editRecord', tab: 'rules', id: 'abc123' }), undefined);
});

test('parseWebviewMessage accepts a well-formed deleteRecord message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'deleteRecord', tab: 'glossary', id: 'abc123' }), {
    type: 'deleteRecord',
    tab: 'glossary',
    id: 'abc123',
  });
});

test('parseWebviewMessage rejects deleteRecord without an id', () => {
  assert.equal(parseWebviewMessage({ type: 'deleteRecord', tab: 'glossary' }), undefined);
});

test('parseWebviewMessage accepts a well-formed addTodo message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addTodo', tab: 'todos', text: 'write tests' }), {
    type: 'addTodo',
    tab: 'todos',
    text: 'write tests',
  });
});

test('parseWebviewMessage rejects addTodo without text, or with a non-string text', () => {
  assert.equal(parseWebviewMessage({ type: 'addTodo', tab: 'todos' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addTodo', tab: 'todos', text: 1 }), undefined);
});

test('parseWebviewMessage accepts a well-formed setStatus message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'setStatus', tab: 'todos', id: 'abc123', done: true }), {
    type: 'setStatus',
    tab: 'todos',
    id: 'abc123',
    done: true,
  });
});

test('parseWebviewMessage rejects setStatus missing id or with a non-boolean done', () => {
  assert.equal(parseWebviewMessage({ type: 'setStatus', tab: 'todos', done: true }), undefined);
  assert.equal(parseWebviewMessage({ type: 'setStatus', tab: 'todos', id: 'abc123', done: 'yes' }), undefined);
});

test('parseWebviewMessage accepts a well-formed setShowAll message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'setShowAll', tab: 'todos', all: true }), {
    type: 'setShowAll',
    tab: 'todos',
    all: true,
  });
});

test('parseWebviewMessage rejects setShowAll with a non-boolean all', () => {
  assert.equal(parseWebviewMessage({ type: 'setShowAll', tab: 'todos', all: 'yes' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'setShowAll', tab: 'todos' }), undefined);
});

test('parseWebviewMessage accepts a well-formed addQuestion message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addQuestion', tab: 'questions', text: 'why?' }), {
    type: 'addQuestion',
    tab: 'questions',
    text: 'why?',
  });
});

test('parseWebviewMessage rejects addQuestion without text, or with a non-string text', () => {
  assert.equal(parseWebviewMessage({ type: 'addQuestion', tab: 'questions' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addQuestion', tab: 'questions', text: 1 }), undefined);
});

test('parseWebviewMessage accepts a well-formed addAnswer message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addAnswer', tab: 'questions', id: 'abc123', text: 'because' }), {
    type: 'addAnswer',
    tab: 'questions',
    id: 'abc123',
    text: 'because',
  });
});

test('parseWebviewMessage rejects addAnswer missing id or text', () => {
  assert.equal(parseWebviewMessage({ type: 'addAnswer', tab: 'questions', text: 'because' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addAnswer', tab: 'questions', id: 'abc123' }), undefined);
});

test('parseWebviewMessage accepts a well-formed toggleExpand message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'toggleExpand', tab: 'questions', id: 'abc123', expanded: true }), {
    type: 'toggleExpand',
    tab: 'questions',
    id: 'abc123',
    expanded: true,
  });
});

test('parseWebviewMessage rejects toggleExpand missing id or with a non-boolean expanded', () => {
  assert.equal(parseWebviewMessage({ type: 'toggleExpand', tab: 'questions', expanded: true }), undefined);
  assert.equal(parseWebviewMessage({ type: 'toggleExpand', tab: 'questions', id: 'abc123', expanded: 'yes' }), undefined);
});

test('parseWebviewMessage accepts a well-formed addBug message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addBug', tab: 'bugs', text: 'crashes on empty input' }), {
    type: 'addBug',
    tab: 'bugs',
    text: 'crashes on empty input',
  });
});

test('parseWebviewMessage rejects addBug without text, or with a non-string text', () => {
  assert.equal(parseWebviewMessage({ type: 'addBug', tab: 'bugs' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addBug', tab: 'bugs', text: 1 }), undefined);
});

test('parseWebviewMessage accepts a well-formed addBugReply message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'addBugReply', tab: 'bugs', id: 'abc123', text: 'reproduced' }), {
    type: 'addBugReply',
    tab: 'bugs',
    id: 'abc123',
    text: 'reproduced',
  });
});

test('parseWebviewMessage rejects addBugReply missing id or text', () => {
  assert.equal(parseWebviewMessage({ type: 'addBugReply', tab: 'bugs', text: 'reproduced' }), undefined);
  assert.equal(parseWebviewMessage({ type: 'addBugReply', tab: 'bugs', id: 'abc123' }), undefined);
});
