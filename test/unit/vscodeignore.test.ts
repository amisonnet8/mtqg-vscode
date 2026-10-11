import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

// out/test/unit/ -> the repository root, three levels up.
const ROOT = path.resolve(__dirname, '..', '..', '..');

function vscodeignoreLines(): string[] {
  return fs
    .readFileSync(path.join(ROOT, '.vscodeignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

// A directory that is not listed in .vscodeignore is packaged into the .vsix
// and published as is. `.srwr/` (the srwr key and the tapes) went into the
// package that way before v1.1.0 was released (todo `77f9e71300`), found
// only by reading `vsce ls` -- so each of the repository's own working
// directories is asserted here instead of relying on someone looking.
for (const entry of ['.claude/**', '.mtqg/**', '.srwr/**', '.srwrignore', '.devcontainer/**', '.github/**', 'src/**', 'test/**', 'docs/**']) {
  test(`.vscodeignore keeps ${entry} out of the package`, () => {
    assert.ok(vscodeignoreLines().includes(entry), `${entry} is missing from .vscodeignore`);
  });
}
