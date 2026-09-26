import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseComposer } from '../../../../src/webview/screens/composer';

test('parseComposer treats plain text as a memo', () => {
  assert.deepEqual(parseComposer('just a note'), { kind: 'memo', text: 'just a note' });
});

test('parseComposer trims surrounding whitespace', () => {
  assert.deepEqual(parseComposer('  just a note  '), { kind: 'memo', text: 'just a note' });
});

test('parseComposer recognizes /todo, /qa, /bug, /rule', () => {
  assert.deepEqual(parseComposer('/todo write more tests'), { kind: 'todo', text: 'write more tests' });
  assert.deepEqual(parseComposer('/qa should we cache this?'), { kind: 'qa', text: 'should we cache this?' });
  assert.deepEqual(parseComposer('/bug crashes on empty input'), { kind: 'bug', text: 'crashes on empty input' });
  assert.deepEqual(parseComposer('/rule write records in English'), { kind: 'rule', text: 'write records in English' });
});

test('parseComposer splits /glossary on the first space', () => {
  assert.deepEqual(parseComposer('/glossary token The smallest unit produced by lexing'), {
    kind: 'glossary',
    word: 'token',
    text: 'The smallest unit produced by lexing',
  });
});

test('parseComposer rejects /glossary missing a definition', () => {
  const result = parseComposer('/glossary token');
  assert.ok('error' in result);
});

test('parseComposer rejects an unknown command rather than falling back to memo', () => {
  const result = parseComposer('/qz something');
  assert.deepEqual(result, { error: 'Unknown command: /qz' });
});

test('parseComposer requires an exact command match (/todos is unknown, not /todo)', () => {
  const result = parseComposer('/todos write more tests');
  assert.ok('error' in result);
});
