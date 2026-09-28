import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMtqgAvailability, describeAvailabilityWarning } from '../../../src/mtqg/availability';
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

test('describeAvailabilityWarning: nothing to show when mtqg is fine', () => {
  const warning = describeAvailabilityWarning({ ok: true, version: 'v1.0.0', format: { repository: 1, supported: 1 } });
  assert.equal(warning, undefined);
});

test('describeAvailabilityWarning: not_found is an error', () => {
  const warning = describeAvailabilityWarning({ ok: false, reason: 'not_found', message: 'Could not run "mtqg".' });
  assert.deepEqual(warning, { severity: 'error', message: 'Could not run "mtqg".' });
});

test('describeAvailabilityWarning: too_old is a warning, with mtqg\'s own message as-is', () => {
  const warning = describeAvailabilityWarning({
    ok: false,
    reason: 'too_old',
    version: 'v0.3.0',
    message: 'mtqg v0.3.0 is older than the 1.0.0 this extension needs. Update mtqg.',
  });
  assert.deepEqual(warning, {
    severity: 'warning',
    message: 'mtqg v0.3.0 is older than the 1.0.0 this extension needs. Update mtqg.',
  });
});
