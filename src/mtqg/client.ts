import { runMtqg, type RunMtqgResult } from './process';
import type {
  AnswerRecord,
  AtInfo,
  BugRecord,
  ChangedResult,
  ContextResult,
  DeleteResult,
  EditResult,
  GlossaryListResult,
  GlossaryRecord,
  ListResult,
  LogOptions,
  LogResult,
  MemoRecord,
  QuestionRecord,
  ReplyRecord,
  RuleRecord,
  SearchResult,
  ShowResult,
  StatefulListResult,
  StatusResult,
  TodoRecord,
  VersionResult,
  AddResult,
} from './types';

export interface Result<T> {
  data: T;
  warnings: RunMtqgResult['warnings'];
}

export interface ListOptions {
  all?: boolean;
}

/**
 * Typed wrappers over `runMtqg`, one per mtqg command this extension uses
 * (directory-structure.md "呼び出しをここ以外に散らさない"). This layer only
 * moves data: it never decides what to show or how (ui.md) -- that is the
 * job of the Webview code that calls it.
 *
 * Every text-taking method requires actual text and always passes it as an
 * explicit argument (never omitted). mtqg opens `$EDITOR` only when a
 * command's text is left out entirely (docs/reference/cli.md "Adding
 * records"), which would hang forever from this headless extension host --
 * always passing an explicit argument, even a blank one, avoids that path
 * (verified against the real binary: an explicit blank argument gets mtqg's
 * own clean `empty_text` error, not $EDITOR). `requireText` below rejects a
 * blank text before mtqg is even run, both as a fast, consistent client-side
 * error and as a second line of defense.
 */
export function createMtqgClient(root: string, binary = 'mtqg') {
  function run(args: string[]): Promise<RunMtqgResult> {
    return runMtqg(root, args, binary);
  }

  /** `--at <path>[:<line>]`, placed right before the free-text arguments. */
  function atArgs(at?: AtInfo): string[] {
    if (!at) {
      return [];
    }
    const value = at.line === undefined ? at.path : `${at.path}:${at.line}`;
    return ['--at', value];
  }

  /**
   * Rejects empty/blank text before ever invoking mtqg (see class doc).
   * Returns a rejected promise rather than throwing synchronously, so every
   * client method is uniformly promise-based -- a caller that only wraps
   * `await client.foo(...)` in try/catch must not be able to miss this.
   */
  function requireText(text: string): Promise<void> {
    if (text.trim() === '') {
      return Promise.reject(new Error('mtqg: text must not be empty'));
    }
    return Promise.resolve();
  }

  /** `--`, so a text that starts with `-` is never mistaken for an option. */
  const TEXT_SEPARATOR = '--';

  return {
    version: () => run(['version']) as Promise<Result<VersionResult>>,
    status: () => run(['status']) as Promise<Result<StatusResult>>,
    context: (opts?: { maxTokens?: number }) =>
      run(['context', ...(opts?.maxTokens !== undefined ? ['--max-tokens', String(opts.maxTokens)] : [])]) as Promise<
        Result<ContextResult>
      >,
    log: (opts?: LogOptions) => {
      const args = ['log'];
      if (opts?.limit !== undefined) {
        args.push('--limit', String(opts.limit));
      }
      if (opts?.kind) {
        args.push('--kind', opts.kind);
      }
      if (opts?.before) {
        args.push('--before', opts.before);
      }
      if (opts?.events) {
        args.push('--events');
      }
      return run(args) as Promise<Result<LogResult>>;
    },
    show: (id: string) => run(['show', id]) as Promise<Result<ShowResult>>,
    search: (text: string) => run(['search', TEXT_SEPARATOR, text]) as Promise<Result<SearchResult>>,
    // Unlike `add`, `edit` never reads an argument after the ID as an option
    // (verified against the real binary: `edit <id> --at ...` and even
    // `edit <id> -- ...` both store the words literally) -- so `--` is not
    // a separator here, only ordinary text. Passing it anyway would corrupt
    // every edit with a literal leading "-- " (bug, found via todo
    // `daf43fc83d`'s manual check, no `--` marker for `edit`).
    edit: (id: string, text: string) =>
      requireText(text).then(() => run(['edit', id, text])) as Promise<Result<EditResult>>,
    delete: (id: string) => run(['delete', id]) as Promise<Result<DeleteResult>>,

    memoAdd: (text: string, at?: AtInfo) =>
      requireText(text).then(() => run(['memo', 'add', ...atArgs(at), TEXT_SEPARATOR, text])) as Promise<
        Result<AddResult<MemoRecord>>
      >,
    memoList: () => run(['memo', 'list']) as Promise<Result<ListResult<MemoRecord>>>,

    todoAdd: (text: string, at?: AtInfo) =>
      requireText(text).then(() => run(['todo', 'add', ...atArgs(at), TEXT_SEPARATOR, text])) as Promise<
        Result<AddResult<TodoRecord>>
      >,
    todoList: (opts?: ListOptions) =>
      run(['todo', 'list', ...(opts?.all ? ['--all'] : [])]) as Promise<Result<StatefulListResult<TodoRecord>>>,
    todoDone: (id: string) => run(['todo', 'done', id]) as Promise<Result<ChangedResult<TodoRecord>>>,
    todoReopen: (id: string) => run(['todo', 'reopen', id]) as Promise<Result<ChangedResult<TodoRecord>>>,

    qaAsk: (question: string, at?: AtInfo) =>
      requireText(question).then(() => run(['qa', 'add', ...atArgs(at), TEXT_SEPARATOR, question])) as Promise<
        Result<AddResult<QuestionRecord>>
      >,
    // `--` goes before the question ID, not between the ID and the answer
    // (same class of bug as glossaryAdd's, found the same way -- verified
    // against the real binary: mtqg only scans for options up to the ID's
    // position, so a `--` placed after it is not stripped).
    qaAnswer: (questionId: string, answer: string, at?: AtInfo) =>
      requireText(answer).then(() =>
        run(['qa', 'add', ...atArgs(at), TEXT_SEPARATOR, questionId, answer]),
      ) as Promise<Result<AddResult<AnswerRecord>>>,
    qaList: (opts?: ListOptions) =>
      run(['qa', 'list', ...(opts?.all ? ['--all'] : [])]) as Promise<Result<StatefulListResult<QuestionRecord>>>,
    qaDone: (id: string) => run(['qa', 'done', id]) as Promise<Result<ChangedResult<QuestionRecord>>>,
    qaReopen: (id: string) => run(['qa', 'reopen', id]) as Promise<Result<ChangedResult<QuestionRecord>>>,

    bugReport: (text: string, at?: AtInfo) =>
      requireText(text).then(() => run(['bug', 'add', ...atArgs(at), TEXT_SEPARATOR, text])) as Promise<
        Result<AddResult<BugRecord>>
      >,
    // `--` before the bug ID, not after it -- same reasoning as qaAnswer above.
    bugReply: (bugId: string, text: string, at?: AtInfo) =>
      requireText(text).then(() =>
        run(['bug', 'add', ...atArgs(at), TEXT_SEPARATOR, bugId, text]),
      ) as Promise<Result<AddResult<ReplyRecord>>>,
    bugList: (opts?: ListOptions) =>
      run(['bug', 'list', ...(opts?.all ? ['--all'] : [])]) as Promise<Result<StatefulListResult<BugRecord>>>,
    bugDone: (id: string) => run(['bug', 'done', id]) as Promise<Result<ChangedResult<BugRecord>>>,
    bugReopen: (id: string) => run(['bug', 'reopen', id]) as Promise<Result<ChangedResult<BugRecord>>>,

    // `--` goes before the word, not between word and definition: like
    // `edit`, mtqg only scans for options up to the word's position, so a
    // `--` placed after it is not stripped and becomes literal text
    // (verified against the real binary -- same class of bug as `edit`'s,
    // found via todo `daf43fc83d`'s manual check).
    glossaryAdd: (word: string, definition: string, at?: AtInfo) =>
      requireText(word)
        .then(() => requireText(definition))
        .then(() => run(['glossary', 'add', ...atArgs(at), TEXT_SEPARATOR, word, definition])) as Promise<
        Result<AddResult<GlossaryRecord>>
      >,
    glossaryList: () => run(['glossary', 'list']) as Promise<Result<GlossaryListResult>>,

    ruleAdd: (text: string, at?: AtInfo) =>
      requireText(text).then(() => run(['rule', 'add', ...atArgs(at), TEXT_SEPARATOR, text])) as Promise<
        Result<AddResult<RuleRecord>>
      >,
    ruleList: () => run(['rule', 'list']) as Promise<Result<ListResult<RuleRecord>>>,
  };
}

export type MtqgClient = ReturnType<typeof createMtqgClient>;
