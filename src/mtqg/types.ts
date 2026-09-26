/**
 * TypeScript mirror of mtqg's `--json` output (docs/reference/cli.md,
 * .mtqg/SCHEMA.md). Interpretation stays in the mtqg CLI; these types only
 * describe the shape this extension reads (.claude/rules/mtqg-cli.md).
 * Unknown fields are simply not declared here -- they are ignored, not
 * rejected, when mtqg adds new ones (mtqg-cli.md "知らないフィールドは無視する").
 */

export type AuthorKind = 'human' | 'ai';

export interface Author {
  kind: AuthorKind;
  name: string;
}

/** Present only on a record written with `--at` (schema.md `at`). */
export interface AtInfo {
  path: string;
  line?: number;
  head?: string;
}

export type RecordState = 'open' | 'done';

interface RecordBase {
  id: string;
  author: Author;
  created: string;
  updated: string;
  at?: AtInfo;
}

export interface MemoRecord extends RecordBase {
  kind: 'memo';
  text: string;
}

export interface TodoRecord extends RecordBase {
  kind: 'todo';
  text: string;
  status: RecordState;
}

export interface AnswerRecord extends RecordBase {
  kind: 'answer';
  text: string;
  re: string;
}

export interface QuestionRecord extends RecordBase {
  kind: 'question';
  text: string;
  status: RecordState;
  /** Only present where the command lists replies alongside the question. */
  replies?: AnswerRecord[];
}

export interface ReplyRecord extends RecordBase {
  kind: 'reply';
  text: string;
  re: string;
}

export interface BugRecord extends RecordBase {
  kind: 'bug';
  text: string;
  status: RecordState;
  replies?: ReplyRecord[];
}

export interface GlossaryRecord extends RecordBase {
  kind: 'glossary';
  word: string;
  text: string;
}

export interface RuleRecord extends RecordBase {
  kind: 'rule';
  text: string;
}

export type MtqgRecord =
  | MemoRecord
  | TodoRecord
  | QuestionRecord
  | AnswerRecord
  | BugRecord
  | ReplyRecord
  | GlossaryRecord
  | RuleRecord;

/** The six kinds a record is *written* as (schema.md `create`'s `type`).
 * An answer/reply is a `qa`/`bug` event with `re` set, not its own type. */
export type JournalRecordType = 'memo' | 'todo' | 'qa' | 'bug' | 'glossary' | 'rule';

/** One line of `.mtqg/journal.jsonl` (schema.md "Line format"). */
export interface JournalEvent {
  id: string;
  op: 'create' | 'status' | 'edit' | 'delete';
  type?: JournalRecordType;
  re?: string;
  from?: RecordState;
  status?: RecordState;
  basis?: number;
  word?: string;
  text?: string;
  at?: AtInfo;
  v: number;
  ts: string;
  author: Author;
  tty?: string;
}

export interface VersionResult {
  command: 'version';
  mtqg: string;
  format: {
    repository: number | null;
    supported: number;
  };
}

export interface StatusResult {
  command: 'status';
  open_todos: number;
  open_questions: number;
  questions_awaiting_confirmation: number;
  open_bugs: number;
  bugs_awaiting_confirmation: number;
  glossary_entries: number;
  duplicate_words: number;
  concurrent_status_changes: number;
  uncommitted_records: number | null;
}

export interface ContextAttentionItem {
  kind: string;
  count: number;
}

export interface ContextSection<T = MtqgRecord> {
  total: number;
  records: T[];
}

export interface ContextResult {
  command: 'context';
  repository: string;
  branch: string;
  attention: ContextAttentionItem[];
  rules: ContextSection<RuleRecord>;
  open_todos: ContextSection<TodoRecord>;
  open_questions: ContextSection<QuestionRecord>;
  open_bugs: ContextSection<BugRecord>;
  recent: ContextSection;
  glossary: ContextSection<GlossaryRecord>;
  truncated: boolean;
  max_tokens: number;
  estimated_tokens: number;
}

export type LogKindFilter = 'memo' | 'todo' | 'qa' | 'bug' | 'glossary' | 'rule';

export interface LogOptions {
  limit?: number;
  kind?: LogKindFilter;
  before?: string;
  /** Adds `events` to each record (log --json --events only). */
  events?: boolean;
}

export interface LogResult {
  command: 'log';
  records: Array<MtqgRecord & { events?: JournalEvent[] }>;
  shown: number;
  total: number;
  /** Only present when `before` was passed: the full ID it resolved to. */
  before?: string;
}

export interface ShowResult {
  command: 'show';
  record: MtqgRecord;
  events: JournalEvent[];
}

export interface SearchResult {
  command: 'search';
  query: string;
  records: MtqgRecord[];
  count: number;
}

export interface AddResult<T extends MtqgRecord> {
  command: string;
  record: T;
}

export interface ChangedResult<T extends MtqgRecord> {
  command: string;
  record: T;
  changed: boolean;
}

export interface EditResult {
  command: 'edit';
  record: MtqgRecord;
  changed: boolean;
}

export interface DeleteResult {
  command: 'delete';
  record: MtqgRecord;
  hidden_replies: MtqgRecord[];
}

/** memo list, rule list. */
export interface ListResult<T extends MtqgRecord> {
  command: string;
  records: T[];
  count: number;
}

/** todo list, qa list, bug list: open/done counts instead of a plain count. */
export interface StatefulListResult<T extends MtqgRecord> {
  command: string;
  records: T[];
  open: number;
  done: number;
}

export interface GlossaryListResult {
  command: 'glossary list';
  records: GlossaryRecord[];
  entries: number;
  duplicate_words: number;
}
