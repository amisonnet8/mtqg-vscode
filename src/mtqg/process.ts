import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { MtqgError, MtqgNotFoundError, parseStderr, type MtqgWarning } from './errors';

const execFileAsync = promisify(execFile);

export interface RunMtqgResult {
  data: unknown;
  warnings: MtqgWarning[];
}

/**
 * Runs one mtqg command and parses its `--json` output
 * (.claude/rules/mtqg-cli.md). Always passes arguments as an array (no
 * shell) and always asks for `--json` and `-C root`, regardless of what the
 * caller passed in `args`.
 *
 * On a non-zero exit, throws the `MtqgError` recovered from stderr (or
 * rethrows the raw error if stderr had no error line mtqg's own contract
 * promises one, but this layer does not assume it). On success, any warning
 * lines on stderr (mtqg-cli.md: warnings can appear even when the command
 * succeeds) are returned alongside the parsed data rather than thrown.
 */
export async function runMtqg(root: string, args: string[], binary = 'mtqg'): Promise<RunMtqgResult> {
  // -C and --json must come before the text of a record (docs/reference/cli.md
  // "Where options go"): anything after a `--` separator in `args` is free
  // text, so appending --json at the end would be swallowed into that text
  // instead of being read as an option (bug, todo cd0d242c55).
  const fullArgs = ['-C', root, '--json', ...args];

  let stdout: string;
  let stderr: string;
  try {
    const result = await execFileAsync(binary, fullArgs);
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err) {
    if (isEnoentError(err)) {
      throw new MtqgNotFoundError(binary);
    }
    const execErr = err as { stdout?: string; stderr?: string };
    const { error } = parseStderr(execErr.stderr ?? '');
    if (error) {
      throw error;
    }
    throw err;
  }

  const { warnings, error } = parseStderr(stderr);
  if (error) {
    // Documented as impossible (errors leave stdout empty and exit non-zero),
    // but do not silently drop a reported error if it somehow happens anyway.
    throw error;
  }

  return { data: JSON.parse(stdout), warnings };
}

function isEnoentError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'ENOENT';
}
