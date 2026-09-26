import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../src/mtqg/client';
import { createPanelController } from '../../../src/webview/controller';
import type { HostMessage } from '../../../src/webview/shared/messages';
import { createTempGitRepo, createTempRepo } from '../../helpers/tempRepo';

function collector() {
  const posts: HostMessage[] = [];
  return { posts, post: (message: HostMessage) => posts.push(message) };
}

async function waitUntil(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('condition not met in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('ready renders the requested tab once', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'ready', tab: 'rules' });
    await waitUntil(() => posts.length === 1);

    assert.equal(posts[0].tab, 'rules');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('selectTab renders the newly selected tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'selectTab', tab: 'bugs' });
    await waitUntil(() => posts.length === 1);
    assert.equal(posts[0].tab, 'bugs');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('a burst of journal changes calls mtqg only once, not once per change', async () => {
  const repo = await createTempRepo();
  try {
    const realClient = createMtqgClient(repo.root);
    let logCalls = 0;
    // A generation guard alone would also make a debounce-free
    // implementation *post* only once here (each stale render's result is
    // discarded on arrival), hiding a missing debounce. Counting the
    // underlying mtqg invocations, not the posts, is what actually catches
    // that (found by mutation-testing this test against a debounce-free
    // controller, todo b9caf0b88c).
    const client = { ...realClient, log: (opts?: Parameters<typeof realClient.log>[0]) => (logCalls++, realClient.log(opts)) };
    const { posts, post } = collector();
    const controller = createPanelController({ client, post, debounceMs: 20 });

    controller.handleMessage({ type: 'selectTab', tab: 'memos' });
    await waitUntil(() => posts.length === 1);

    controller.journalChanged();
    controller.journalChanged();
    controller.journalChanged();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // One call from selectTab, plus exactly one coalesced from the burst.
    assert.equal(logCalls, 2);
    assert.equal(posts.length, 2);
    assert.equal(posts[1].tab, 'memos');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('an invalid message is ignored', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'selectTab', tab: 'not-a-tab' });
    controller.handleMessage(null);
    controller.handleMessage('nonsense');
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(posts.length, 0);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addRule writes through mtqg and re-renders the rules tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'addRule', tab: 'rules', text: 'Write records in English' });
    await waitUntil(() => posts.length === 1);

    assert.equal(posts[0].tab, 'rules');
    assert.match(posts[0].html, /Write records in English/);
    const list = await client.ruleList();
    assert.equal(list.data.count, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addGlossary writes through mtqg and re-renders the glossary tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'addGlossary', tab: 'glossary', word: 'token', text: 'a lexical unit' });
    await waitUntil(() => posts.length === 1);

    // The exact editable-cell value, not just a substring: catches a stray
    // separator getting prepended (client.ts `glossaryAdd` bug found via
    // this todo's manual check).
    assert.match(posts[0].html, /data-original="a lexical unit"/);
    const list = await client.glossaryList();
    assert.equal(list.data.entries, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addTodo writes through mtqg and re-renders the todos tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'addTodo', tab: 'todos', text: 'write more tests' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /write more tests/);
    const list = await client.todoList();
    assert.equal(list.data.open, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('setStatus with done:true marks the todo done, and done:false reopens it', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.todoAdd('write more tests');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'setStatus', tab: 'todos', id: added.data.record.id, done: true });
    await waitUntil(() => posts.length === 1);
    let list = await client.todoList({ all: true });
    assert.equal(list.data.records.find((r) => r.id === added.data.record.id)?.status, 'done');

    controller.handleMessage({ type: 'setStatus', tab: 'todos', id: added.data.record.id, done: false });
    await waitUntil(() => posts.length === 2);
    list = await client.todoList({ all: true });
    assert.equal(list.data.records.find((r) => r.id === added.data.record.id)?.status, 'open');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('setShowAll reveals done todos, and the toggle survives a later journalChanged re-render', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.todoAdd('finish this');
    await client.todoDone(added.data.record.id);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'ready', tab: 'todos' });
    await waitUntil(() => posts.length === 1);
    assert.doesNotMatch(posts[0].html, new RegExp(added.data.record.id));

    controller.handleMessage({ type: 'setShowAll', tab: 'todos', all: true });
    await waitUntil(() => posts.length === 2);
    assert.match(posts[1].html, new RegExp(added.data.record.id));

    controller.journalChanged();
    await waitUntil(() => posts.length === 3, 2000);
    assert.match(posts[2].html, new RegExp(added.data.record.id));
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addQuestion writes through mtqg and re-renders the questions tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'addQuestion', tab: 'questions', text: 'Should we cache this?' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /Should we cache this\?/);
    const list = await client.qaList();
    assert.equal(list.data.open, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addAnswer adds a reply to the question, visible once expanded', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'toggleExpand', tab: 'questions', id: asked.data.record.id, expanded: true });
    await waitUntil(() => posts.length === 1);

    controller.handleMessage({ type: 'addAnswer', tab: 'questions', id: asked.data.record.id, text: 'Yes, in v2' });
    await waitUntil(() => posts.length === 2);

    assert.match(posts[1].html, /Yes, in v2/);
    const list = await client.qaList();
    assert.equal(list.data.records[0].replies?.[0]?.text, 'Yes, in v2');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('setStatus on the questions tab marks a question answered, and reopens it', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'setStatus', tab: 'questions', id: asked.data.record.id, done: true });
    await waitUntil(() => posts.length === 1);
    let list = await client.qaList({ all: true });
    assert.equal(list.data.records[0].status, 'done');

    controller.handleMessage({ type: 'setStatus', tab: 'questions', id: asked.data.record.id, done: false });
    await waitUntil(() => posts.length === 2);
    list = await client.qaList({ all: true });
    assert.equal(list.data.records[0].status, 'open');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('toggleExpand shows the reply thread, and the state survives a later journalChanged re-render', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'ready', tab: 'questions' });
    await waitUntil(() => posts.length === 1);
    // The reply is in the markup either way (it's a `hidden` <tr>, not
    // omitted) -- collapsed is checked via the detail row's `hidden`
    // attribute and the toggle button's `aria-expanded`, not by the
    // reply's absence.
    assert.match(posts[0].html, /class="thread-detail"[^>]* hidden>/);
    assert.match(posts[0].html, /aria-expanded="false"/);

    controller.handleMessage({ type: 'toggleExpand', tab: 'questions', id: asked.data.record.id, expanded: true });
    await waitUntil(() => posts.length === 2);
    assert.doesNotMatch(posts[1].html, /class="thread-detail"[^>]* hidden>/);
    assert.match(posts[1].html, /aria-expanded="true"/);
    assert.match(posts[1].html, /Yes, in v2/);

    controller.journalChanged();
    await waitUntil(() => posts.length === 3, 2000);
    assert.doesNotMatch(posts[2].html, /class="thread-detail"[^>]* hidden>/);
    assert.match(posts[2].html, /Yes, in v2/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addBug writes through mtqg and re-renders the bugs tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'addBug', tab: 'bugs', text: 'crashes on empty input' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /crashes on empty input/);
    const list = await client.bugList();
    assert.equal(list.data.open, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('addBugReply adds a reply to the bug, visible once expanded', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const bug = await client.bugReport('crashes on empty input');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'toggleExpand', tab: 'bugs', id: bug.data.record.id, expanded: true });
    await waitUntil(() => posts.length === 1);

    controller.handleMessage({ type: 'addBugReply', tab: 'bugs', id: bug.data.record.id, text: 'reproduced on macOS too' });
    await waitUntil(() => posts.length === 2);

    assert.match(posts[1].html, /reproduced on macOS too/);
    const list = await client.bugList();
    assert.equal(list.data.records[0].replies?.[0]?.text, 'reproduced on macOS too');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('setStatus on the bugs tab marks a bug closed, and reopens it', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const bug = await client.bugReport('crashes on empty input');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'setStatus', tab: 'bugs', id: bug.data.record.id, done: true });
    await waitUntil(() => posts.length === 1);
    let list = await client.bugList({ all: true });
    assert.equal(list.data.records[0].status, 'done');

    controller.handleMessage({ type: 'setStatus', tab: 'bugs', id: bug.data.record.id, done: false });
    await waitUntil(() => posts.length === 2);
    list = await client.bugList({ all: true });
    assert.equal(list.data.records[0].status, 'open');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('editRecord changes an existing record\'s text', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.ruleAdd('original text');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'editRecord', tab: 'rules', id: added.data.record.id, text: 'edited text' });
    await waitUntil(() => posts.length === 1);

    // Exact match, not just a substring: catches a stray separator getting
    // prepended to the saved text (bug found via todo daf43fc83d's manual
    // check -- src/mtqg/client.ts `edit` used to add "-- " in front).
    assert.match(posts[0].html, /data-original="edited text"/);
    assert.doesNotMatch(posts[0].html, /original text/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('deleteRecord hides the record from the re-rendered tab', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.ruleAdd('to be deleted');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'deleteRecord', tab: 'rules', id: added.data.record.id });
    await waitUntil(() => posts.length === 1);

    assert.doesNotMatch(posts[0].html, /to be deleted/);
    const list = await client.ruleList();
    assert.equal(list.data.count, 0);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('a write to an unknown id renders mtqg\'s own error instead of crashing the controller', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'editRecord', tab: 'rules', id: 'zzzzzzzz', text: 'anything' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /class="error"/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('compose without a slash posts a memo', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'compose', tab: 'memos', text: 'just a note' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /just a note/);
    const list = await client.memoList();
    assert.equal(list.data.count, 1);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('compose with /todo posts a todo, and /glossary posts a term and definition', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'compose', tab: 'memos', text: '/todo write more tests' });
    await waitUntil(() => posts.length === 1);
    assert.equal((await client.todoList()).data.open, 1);

    controller.handleMessage({ type: 'compose', tab: 'memos', text: '/glossary token a lexical unit' });
    await waitUntil(() => posts.length === 2);
    const glossary = await client.glossaryList();
    assert.equal(glossary.data.records[0]?.word, 'token');
    assert.equal(glossary.data.records[0]?.text, 'a lexical unit');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('compose with an unknown command shows a notice and never calls mtqg', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'compose', tab: 'memos', text: '/qz something' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /Unknown command: \/qz/);
    const list = await client.log();
    assert.equal(list.data.total, 0);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('loadEarlier increases how many records are fetched', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    for (let i = 0; i < 55; i++) {
      await client.memoAdd(`memo ${i}`);
    }
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'ready', tab: 'memos' });
    await waitUntil(() => posts.length === 1);
    // All 55 memos share the same second, so `log`'s tie-break for *which*
    // 50 it returns is unspecified (same finding as `todo list`/`qa
    // list`'s ordering, `.claude/rules/mtqg-cli.md`) -- count posts rather
    // than asserting a particular one is (not) present.
    assert.equal((posts[0].html.match(/<article/g) ?? []).length, 50);
    assert.match(posts[0].html, /Load earlier/);

    controller.handleMessage({ type: 'loadEarlier', tab: 'memos' });
    await waitUntil(() => posts.length === 2);
    assert.equal((posts[1].html.match(/<article/g) ?? []).length, 55);
    assert.doesNotMatch(posts[1].html, /Load earlier/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('undo reverts the last write and shows a notice describing it', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'compose', tab: 'memos', text: 'oops' });
    await waitUntil(() => posts.length === 1);

    controller.handleMessage({ type: 'undo', tab: 'memos' });
    await waitUntil(() => posts.length === 2);

    assert.match(posts[1].html, /Undid post of &quot;oops&quot;/);
    assert.equal((await client.log()).data.total, 0);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('undo with nothing to undo shows mtqg\'s own message, not a screen-wide error', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'undo', tab: 'memos' });
    await waitUntil(() => posts.length === 1);

    assert.doesNotMatch(posts[0].html, /class="error"/);
    assert.match(posts[0].html, /Nothing to undo/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('setStatus with a kind marks a question answered from the Memo screen', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'setStatus', tab: 'memos', id: asked.data.record.id, done: true, kind: 'question' });
    await waitUntil(() => posts.length === 1);

    const list = await client.qaList({ all: true });
    assert.equal(list.data.records[0].status, 'done');
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});

test('outside an initialized repository, the rendered tab shows mtqg\'s own error message', async () => {
  const repo = await createTempGitRepo();
  try {
    const client = createMtqgClient(repo.root);
    const { posts, post } = collector();
    const controller = createPanelController({ client, post });

    controller.handleMessage({ type: 'ready', tab: 'rules' });
    await waitUntil(() => posts.length === 1);

    assert.match(posts[0].html, /class="error"/);
    controller.dispose();
  } finally {
    await repo.cleanup();
  }
});
