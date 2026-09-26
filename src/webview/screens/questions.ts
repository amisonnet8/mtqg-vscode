import type { QuestionRecord } from '../../mtqg/types';
import { renderThread, type ThreadLabels, type ThreadView } from './thread';

export type QuestionsView = ThreadView;

/** naming.md: question/answer, not question/reply (bug `48b5d29d54a3`). */
const QA_LABELS: ThreadLabels = {
  columnHeader: 'Question',
  topPlaceholder: 'Ask a question…',
  replyPlaceholder: 'Write an answer…',
  replyNounPlural: 'Answers',
  doneLabel: 'Mark answered',
  showAllLabel: 'Show answered',
  sectionHeading: 'Answered',
};

export function renderQuestions(records: QuestionRecord[], view: QuestionsView = {}): string {
  return renderThread(records, QA_LABELS, view);
}
