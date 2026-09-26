import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMtqgAvailability } from '../../../src/mtqg/availability';
import { createTempPlainDir } from '../../helpers/tempRepo';

test('a real mtqg on PATH reports ok with its version', async () => {
  const repo = await createTempPlainDir();
  try {
    const result = await checkMtqgAvailability(repo.root);
    assert.ok(result.ok);
    assert.match(result.version, /^v\d+\.\d+\.\d+$/);
  } finally {
    await repo.cleanup();
  }
});

test('a missing binary reports not_found', async () => {
  const repo = await createTempPlainDir();
  try {
    const result = await checkMtqgAvailability(repo.root, 'mtqg-does-not-exist');
    assert.equal(result.ok, false);
    assert.ok(!result.ok);
    assert.equal(result.reason, 'not_found');
  } finally {
    await repo.cleanup();
  }
});
