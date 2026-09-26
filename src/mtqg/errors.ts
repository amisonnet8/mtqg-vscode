/**
 * mtqg's `--json` error/warning lines on standard error
 * (.claude/rules/mtqg-cli.md, docs/reference/cli.md "JSON output").
 */

/** The `kind` values documented in docs/reference/cli.md's error table. */
export type MtqgErrorKind =
  | 'usage'
  | 'not_available'
  | 'not_in_repository'
  | 'not_initialized'
  | 'already_initialized'
  | 'format_too_new'
  | 'conflict_markers'
  | 'lock_timeout'
  | 'no_author'
  | 'bad_author_kind'
  | 'empty_text'
  | 'empty_word'
  | 'invalid_text'
  | 'input'
  | 'editor'
  | 'git_unavailable'
  | 'not_found'
  | 'id_too_short'
  | 'ambiguous'
  | 'wrong_kind'
  | 'no_state'
  | 'no_replies'
  | 'nothing_to_undo'
  | 'has_later_events'
  | 'unknown';

/**
 * An error mtqg reported (`{"error": {...}}` on stderr). `kind` is for
 * telling errors apart mechanically; `message` is mtqg's own wording and may
 * be shown to a person as-is (mtqg-cli.md). Fields beyond `kind`/`message`
 * (`prefix`, `candidates`, `record`, `wanted`, ...) vary by `kind` and are
 * kept as `details` rather than typed individually here -- this layer passes
 * them through without interpreting them.
 */
export class MtqgError extends Error {
  readonly kind: MtqgErrorKind;
  readonly details: Record<string, unknown>;

  constructor(kind: MtqgErrorKind, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MtqgError';
    this.kind = kind;
    this.details = details;
  }
}

/** The `mtqg` executable itself could not be started (ENOENT). */
export class MtqgNotFoundError extends Error {
  constructor(binary: string) {
    super(`Could not run "${binary}". Is mtqg installed and on PATH?`);
    this.name = 'MtqgNotFoundError';
  }
}

export type MtqgWarningKind =
  | 'invalid_json'
  | 'invalid_utf8'
  | 'missing_field'
  | 'conflict_marker'
  | 'no_trailing_newline'
  | 'unreadable'
  | 'git_unavailable'
  | 'more';

export interface MtqgWarning {
  kind: MtqgWarningKind;
  message: string;
  line?: number;
  count?: number;
}

interface ParsedStderr {
  warnings: MtqgWarning[];
  error?: MtqgError;
}

/**
 * Parses mtqg's stderr, one JSON line at a time. A line that is not one of
 * mtqg's own `{"error":...}` / `{"warning":...}` objects is ignored rather
 * than thrown on -- mtqg's own contract only promises these two shapes, but
 * being defensive here costs nothing and keeps a future, unrelated stderr
 * line from crashing this layer.
 */
export function parseStderr(stderr: string): ParsedStderr {
  const warnings: MtqgWarning[] = [];
  let error: MtqgError | undefined;

  for (const line of stderr.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== 'object') {
      continue;
    }

    if ('error' in parsed && parsed.error && typeof parsed.error === 'object') {
      const e = parsed.error as Record<string, unknown>;
      const { kind, message, ...details } = e;
      if (typeof kind === 'string' && typeof message === 'string') {
        error = new MtqgError(kind as MtqgErrorKind, message, details);
      }
    } else if ('warning' in parsed && parsed.warning && typeof parsed.warning === 'object') {
      const w = parsed.warning as Record<string, unknown>;
      if (typeof w.kind === 'string' && typeof w.message === 'string') {
        warnings.push(w as unknown as MtqgWarning);
      }
    }
  }

  return { warnings, error };
}
