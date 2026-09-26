import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TempRepo {
  root: string;
  cleanup(): Promise<void>;
}

/**
 * Creates a throwaway git repository with `.mtqg/` initialized, for tests
 * that exercise src/mtqg/ against the real `mtqg` binary
 * (.claude/rules/testing.md "モックで済ませない").
 */
export async function createTempRepo(): Promise<TempRepo> {
  const { root, cleanup } = await createTempGitRepo();
  await execFileAsync('mtqg', ['init'], { cwd: root });
  return { root, cleanup };
}

/** A git repository without `.mtqg/` (for the `not_initialized` case). */
export async function createTempGitRepo(): Promise<TempRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mtqg-vscode-test-'));
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'test'], { cwd: root });

  return {
    root,
    async cleanup() {
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

/** A plain directory, not a git repository at all (for `not_in_repository`). */
export async function createTempPlainDir(): Promise<TempRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mtqg-vscode-test-'));
  return {
    root,
    async cleanup() {
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}
