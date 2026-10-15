import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { createMtqgClient } from '../../../src/mtqg/client';
import { createTempRepo } from '../../helpers/tempRepo';

test('the temporary repository does not see the developer\'s git config or mtqg author', async () => {
  const repo = await createTempRepo();
  try {
    // HOME and the global git config point into a throwaway directory.
    assert.equal(os.homedir(), process.env.HOME);
    assert.equal(path.dirname(process.env.GIT_CONFIG_GLOBAL ?? ''), process.env.HOME);
    // user.name is given on the "command line" (GIT_CONFIG_*), not by any file.
    assert.equal(
      execFileSync('git', ['config', '--show-origin', '--get', 'user.name'], { cwd: repo.root, encoding: 'utf8' }).trim(),
      'command line:\ttest',
    );
    assert.equal(process.env.MTQG_AUTHOR_NAME, undefined);

    // The author comes from the env this helper sets, not from MTQG_AUTHOR_*
    // or the developer's user.name, so it is the same inside an AI agent and in CI.
    const added = await createMtqgClient(repo.root).memoAdd('who wrote this');
    assert.deepEqual(added.data.record.author, { kind: 'human', name: 'test' });
  } finally {
    await repo.cleanup();
  }
});
