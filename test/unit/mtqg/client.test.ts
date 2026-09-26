import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../src/mtqg/client';
import { createTempRepo } from '../../helpers/tempRepo';

test('todo: add, list, done, reopen', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);

    const added = await client.todoAdd('write more tests');
    assert.equal(added.data.record.status, 'open');
    const id = added.data.record.id;

    const listed = await client.todoList();
    assert.equal(listed.data.open, 1);
    assert.equal(listed.data.records.some((r) => r.id === id), true);

    const done = await client.todoDone(id);
    assert.equal(done.data.record.status, 'done');
    assert.equal(done.data.changed, true);

    const doneAgain = await client.todoDone(id);
    assert.equal(doneAgain.data.changed, false);

    const reopened = await client.todoReopen(id);
    assert.equal(reopened.data.record.status, 'open');
  } finally {
    await repo.cleanup();
  }
});

test('qa: ask, answer, done', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);

    const question = await client.qaAsk('Should we support nested comments?');
    assert.equal(question.data.record.status, 'open');

    const answer = await client.qaAnswer(question.data.record.id, 'Not in v1');
    assert.equal(answer.data.record.re, question.data.record.id);

    const done = await client.qaDone(question.data.record.id);
    assert.equal(done.data.record.status, 'done');

    const shown = await client.show(question.data.record.id);
    assert.equal(shown.data.record.kind, 'question');
  } finally {
    await repo.cleanup();
  }
});

test('bug: report, reply, done', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);

    const bug = await client.bugReport('crashes on empty input');
    const reply = await client.bugReply(bug.data.record.id, 'reproduced on macOS too');
    assert.equal(reply.data.record.re, bug.data.record.id);

    const list = await client.bugList();
    assert.equal(list.data.open, 1);

    await client.bugDone(bug.data.record.id);
    const listAfter = await client.bugList();
    assert.equal(listAfter.data.open, 0);
  } finally {
    await repo.cleanup();
  }
});

test('glossary: add, list, duplicate words are counted', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);

    await client.glossaryAdd('token', 'The smallest unit produced by lexing');
    const once = await client.glossaryList();
    assert.equal(once.data.duplicate_words, 0);

    await client.glossaryAdd('token', 'A different definition');
    const twice = await client.glossaryList();
    assert.equal(twice.data.entries, 2);
    assert.equal(twice.data.duplicate_words, 1);
  } finally {
    await repo.cleanup();
  }
});

test('rule: add, list', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.ruleAdd('Write records in English');
    const list = await client.ruleList();
    assert.equal(list.data.count, 1);
  } finally {
    await repo.cleanup();
  }
});

test('memo: add, list', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.memoAdd('Noticed while implementing the client');
    const list = await client.memoList();
    assert.equal(list.data.count, 1);
  } finally {
    await repo.cleanup();
  }
});

test('--at records where the text was written about', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.todoAdd('fix this', { path: 'src/lex.ts', line: 42 });
    assert.equal(added.data.record.at?.path, 'src/lex.ts');
    assert.equal(added.data.record.at?.line, 42);
  } finally {
    await repo.cleanup();
  }
});

test('text starting with "-" is recorded literally, not parsed as an option', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.memoAdd('-1 is not a valid index');
    assert.equal(added.data.record.text, '-1 is not a valid index');
  } finally {
    await repo.cleanup();
  }
});

test('empty or blank text is rejected without invoking mtqg', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await assert.rejects(() => client.memoAdd(''));
    await assert.rejects(() => client.memoAdd('   '));

    // Nothing should have been written.
    const list = await client.memoList();
    assert.equal(list.data.count, 0);
  } finally {
    await repo.cleanup();
  }
});

test('search and log', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.memoAdd('a note about parsing comments');
    await client.todoAdd('handle block comments');

    const found = await client.search('comment');
    assert.equal(found.data.count, 2);

    const logged = await client.log({ limit: 1 });
    assert.equal(logged.data.records.length, 1);
    assert.equal(logged.data.total, 2);
  } finally {
    await repo.cleanup();
  }
});

test('log --before pages backwards, oldest last', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.memoAdd('first');
    await client.memoAdd('second');
    await client.memoAdd('third');

    const firstPage = await client.log({ limit: 2 });
    assert.equal(firstPage.data.records.length, 2);
    const oldestShown = firstPage.data.records[firstPage.data.records.length - 1].id;

    const nextPage = await client.log({ before: oldestShown });
    assert.equal(nextPage.data.before, oldestShown);
    assert.equal(nextPage.data.records.length, 1);
  } finally {
    await repo.cleanup();
  }
});

test('log --events includes the record\'s own journal lines', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.todoAdd('write docs');
    await client.todoDone(added.data.record.id);

    const logged = await client.log({ events: true, kind: 'todo' });
    const record = logged.data.records.find((r) => r.id === added.data.record.id);
    assert.ok(record?.events);
    assert.equal(record.events.length, 2);
    assert.equal(record.events[0].op, 'create');
    assert.equal(record.events[1].op, 'status');
  } finally {
    await repo.cleanup();
  }
});

test('status and context reflect what was recorded', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.todoAdd('an open todo');

    const status = await client.status();
    assert.equal(status.data.open_todos, 1);

    const context = await client.context();
    assert.equal(context.data.open_todos.total, 1);
  } finally {
    await repo.cleanup();
  }
});
