import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { test } from 'node:test';
import { MtqgError, MtqgNotFoundError } from '../../../src/mtqg/errors';
import { runMtqg } from '../../../src/mtqg/process';
import { createTempGitRepo, createTempPlainDir, createTempRepo } from '../../helpers/tempRepo';

test('a missing mtqg binary throws MtqgNotFoundError', async () => {
  const repo = await createTempPlainDir();
  try {
    await assert.rejects(
      () => runMtqg(repo.root, ['version'], 'mtqg-does-not-exist'),
      (err: unknown) => err instanceof MtqgNotFoundError,
    );
  } finally {
    await repo.cleanup();
  }
});

test('outside a git repository, a command throws not_in_repository', async () => {
  const repo = await createTempPlainDir();
  try {
    await assert.rejects(
      () => runMtqg(repo.root, ['todo', 'list']),
      (err: unknown) => err instanceof MtqgError && err.kind === 'not_in_repository',
    );
  } finally {
    await repo.cleanup();
  }
});

test('in a git repository without .mtqg/, a command throws not_initialized', async () => {
  const repo = await createTempGitRepo();
  try {
    await assert.rejects(
      () => runMtqg(repo.root, ['todo', 'list']),
      (err: unknown) => err instanceof MtqgError && err.kind === 'not_initialized',
    );
  } finally {
    await repo.cleanup();
  }
});

test('an unknown ID throws not_found with the prefix in details', async () => {
  const repo = await createTempRepo();
  try {
    await assert.rejects(
      () => runMtqg(repo.root, ['show', 'zzzzzzzz']),
      (err: unknown) => {
        assert.ok(err instanceof MtqgError);
        assert.equal(err.kind, 'not_found');
        assert.equal(err.details.prefix, 'zzzzzzzz');
        return true;
      },
    );
  } finally {
    await repo.cleanup();
  }
});

test('a successful command still surfaces warnings from stderr', async () => {
  const repo = await createTempRepo();
  try {
    // A hand-corrupted line that mtqg's own reader skips with a warning
    // (schema.md "Reading": a line that is not a valid JSON object).
    await fs.appendFile(path.join(repo.root, '.mtqg', 'journal.jsonl'), 'not valid json\n');

    const { data, warnings } = await runMtqg(repo.root, ['todo', 'list']);
    assert.ok(data);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].kind, 'invalid_json');
  } finally {
    await repo.cleanup();
  }
});

test('--json is always added, even if the caller does not pass it', async () => {
  const repo = await createTempRepo();
  try {
    const { data } = await runMtqg(repo.root, ['version']);
    assert.equal((data as { command: string }).command, 'version');
  } finally {
    await repo.cleanup();
  }
});
