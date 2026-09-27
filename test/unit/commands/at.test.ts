import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeAt } from '../../../src/commands/at';

test('computeAt turns a plain cursor position into a 1-based line', () => {
  const at = computeAt('/repo', '/repo/src/foo.ts', { startLine: 0, endLine: 0 });
  assert.equal(at.path, 'src/foo.ts');
  assert.equal(at.line, 1);
});

test('computeAt uses the first line of a multi-line selection', () => {
  const at = computeAt('/repo', '/repo/src/foo.ts', { startLine: 5, endLine: 10 });
  assert.equal(at.line, 6);
});

test('computeAt gives the same result whether the selection was dragged down or up', () => {
  const draggedDown = computeAt('/repo', '/repo/src/foo.ts', { startLine: 5, endLine: 10 });
  const draggedUp = computeAt('/repo', '/repo/src/foo.ts', { startLine: 10, endLine: 5 });
  assert.equal(draggedDown.line, draggedUp.line);
});

test('computeAt never sets head -- mtqg fills that in itself', () => {
  const at = computeAt('/repo', '/repo/src/foo.ts', { startLine: 0, endLine: 0 });
  assert.equal(at.head, undefined);
});

test('computeAt makes the path relative to the workspace root', () => {
  const at = computeAt('/repo', '/repo/nested/dir/file.ts', { startLine: 0, endLine: 0 });
  assert.equal(at.path, 'nested/dir/file.ts');
});

test('computeAt does not throw for a file outside the workspace root (not blocked, just not normalized)', () => {
  const at = computeAt('/repo/sub', '/repo/other/file.ts', { startLine: 0, endLine: 0 });
  assert.equal(at.path, '../other/file.ts');
});

// path.relative uses the OS native separator (`\` on Windows); mtqg records
// the path as-is, so a Windows-made record would otherwise carry backslashes
// forever (bug `d9edda4615d9`, found on CI's windows-latest leg).
test('computeAt always uses forward slashes, regardless of the OS path separator', () => {
  const at = computeAt('/repo', '/repo/nested/dir/file.ts', { startLine: 0, endLine: 0 });
  assert.ok(!at.path.includes('\\'), `expected no backslashes in ${at.path}`);
  assert.equal(at.path, 'nested/dir/file.ts');
});
