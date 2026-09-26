import { MtqgNotFoundError } from './errors';
import { runMtqg } from './process';
import type { VersionResult } from './types';

/**
 * Kept in sync with the `mtqg` release .devcontainer/postCreate.sh installs
 * (.claude/rules/mtqg-cli.md "版"). Bump both together, after checking the
 * new release's `--json` only adds fields.
 */
export const MIN_SUPPORTED_MTQG_VERSION = '0.3.0';

export type AvailabilityResult =
  | { ok: true; version: string; format: VersionResult['format'] }
  | { ok: false; reason: 'not_found'; message: string }
  | { ok: false; reason: 'too_old'; message: string; version: string };

/**
 * A one-time check meant for extension activation: is `mtqg` on PATH, and
 * is it recent enough for the CLI features this extension relies on?
 *
 * This does **not** check whether the workspace is a git repository with
 * `.mtqg/` initialized -- `mtqg version` does not fail for that (verified
 * against the real binary; it just reports `format.repository: null`).
 * That distinction only shows up once an actual command is run against the
 * workspace, as an `MtqgError` with kind `not_in_repository` or
 * `not_initialized` -- callers should catch that where they act on a
 * workspace, and show `error.message` as-is (mtqg-cli.md).
 */
export async function checkMtqgAvailability(root: string, binary = 'mtqg'): Promise<AvailabilityResult> {
  let data: unknown;
  try {
    ({ data } = await runMtqg(root, ['version'], binary));
  } catch (err) {
    if (err instanceof MtqgNotFoundError) {
      return { ok: false, reason: 'not_found', message: err.message };
    }
    throw err;
  }

  const result = data as VersionResult;
  const version = parseVersion(result.mtqg);
  if (version && compareVersions(version, parseVersion(MIN_SUPPORTED_MTQG_VERSION)!) < 0) {
    return {
      ok: false,
      reason: 'too_old',
      version: result.mtqg,
      message: `mtqg ${result.mtqg} is older than the ${MIN_SUPPORTED_MTQG_VERSION} this extension needs. Update mtqg.`,
    };
  }

  return { ok: true, version: result.mtqg, format: result.format };
}

type Semver = [number, number, number];

/** `"v0.3.0"` -> `[0, 3, 0]`. A dev/commit-based build (unparseable) -> `undefined`, treated as "assume fine". */
function parseVersion(raw: string): Semver | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(raw);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}
