import type { BugRecord } from '../../mtqg/types';
import { renderThread, type ThreadLabels, type ThreadView } from './thread';

export type BugsView = ThreadView;

/** naming.md: bug/reply, not bug/answer (mirrors questions.ts's QA_LABELS). */
const BUG_LABELS: ThreadLabels = {
  columnHeader: 'Bug',
  topPlaceholder: 'Report a bug…',
  replyPlaceholder: 'Write a reply…',
  replyNounPlural: 'Replies',
  doneLabel: 'Mark closed',
  showAllLabel: 'Show closed',
  sectionHeading: 'Closed',
};

export function renderBugs(records: BugRecord[], view: BugsView = {}): string {
  return renderThread(records, BUG_LABELS, view);
}
