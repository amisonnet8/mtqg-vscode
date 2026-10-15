import { execFile } from 'node:child_process';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Cuts the environment the tests' child processes run with (git, and mtqg --
 * which reads user.name through git when MTQG_AUTHOR_NAME is unset) off from
 * the developer's own setup (.claude/rules/testing.md "テストの書き方"):
 * HOME and GIT_CONFIG_GLOBAL point into a throwaway directory, the system
 * config is skipped, and user.name/user.email come from GIT_CONFIG_* here
 * rather than from any config file. MTQG_AUTHOR_* and MTQG_TTY are dropped
 * so a run inside an AI agent (which sets them) records the same author as
 * CI does.
 *
 * The code under test (src/mtqg/process.ts) starts mtqg with this process's
 * environment, so this changes process.env itself (in place, keeping its
 * case-insensitive keys on Windows), once, when this module is loaded;
 * every child process then inherits it.
 */
function isolateEnv(home: string): void {
  Object.assign(process.env, {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'user.name',
    GIT_CONFIG_VALUE_0: 'test',
    GIT_CONFIG_KEY_1: 'user.email',
    GIT_CONFIG_VALUE_1: 'test@example.com',
  });
  delete process.env.MTQG_AUTHOR_KIND;
  delete process.env.MTQG_AUTHOR_NAME;
  delete process.env.MTQG_TTY;
}

const testHome = fsSync.mkdtempSync(path.join(os.tmpdir(), 'mtqg-vscode-home-'));
process.on('exit', () => fsSync.rmSync(testHome, { recursive: true, force: true }));
isolateEnv(testHome);

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
  await execFileAsync('mtqg', ['init'], { cwd: root, env: process.env });
  return { root, cleanup };
}

/** A git repository without `.mtqg/` (for the `not_initialized` case). */
export async function createTempGitRepo(): Promise<TempRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mtqg-vscode-test-'));
  await execFileAsync('git', ['init', '-q'], { cwd: root, env: process.env });

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
