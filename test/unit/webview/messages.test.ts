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
