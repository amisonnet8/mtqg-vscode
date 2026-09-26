import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  // out/test/vscode/runTest.js -> repository root is three levels up.
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // --disable-gpu: this container has no real GPU, and leaving GPU
      // acceleration on (even with --disable-gpu-sandbox) has left the
      // downloaded VS Code hanging on shutdown after a Webview test
      // (bug, todo 97779f964e).
      launchArgs: ['--disable-extensions', '--disable-gpu'],
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();
