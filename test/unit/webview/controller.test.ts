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

    controller.handleMessage({ type: 'ready', tab: 'todos' });
    await waitUntil(() => posts.length === 1);

    assert.equal(posts[0].tab, 'todos');
    assert.match(posts[0].html, /coming soon/);
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
    let statusCalls = 0;
    // A generation guard alone would also make a debounce-free
    // implementation *post* only once here (each stale render's result is
    // discarded on arrival), hiding a missing debounce. Counting the
    // underlying mtqg invocations, not the posts, is what actually catches
    // that (found by mutation-testing this test against a debounce-free
    // controller, todo b9caf0b88c).
    const client = { ...realClient, status: () => (statusCalls++, realClient.status()) };
    const { posts, post } = collector();
    const controller = createPanelController({ client, post, debounceMs: 20 });

    controller.handleMessage({ type: 'selectTab', tab: 'memos' });
    await waitUntil(() => posts.length === 1);

    controller.journalChanged();
    controller.journalChanged();
    controller.journalChanged();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // One call from selectTab, plus exactly one coalesced from the burst.
    assert.equal(statusCalls, 2);
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
