import * as path from 'node:path';
import { run as runNodeTest } from 'node:test';
import { spec as SpecReporter } from 'node:test/reporters';

/**
 * Entry point @vscode/test-electron loads inside the extension development
 * host. Runs the suite's own tests with node:test's programmatic API instead
 * of mocha (.claude/rules/dependencies.md: no @vscode/test-cli).
 */
export function run(): Promise<void> {
  const files = [path.join(__dirname, 'extension.test.js')];

  return new Promise((resolve, reject) => {
    // isolation: 'none' -- without it, node:test runs each file in a fresh
    // child process, which does not have the `vscode` module that the
    // extension host injects into *this* process only (bug, todo 97779f964e).
    const stream = runNodeTest({ files, concurrency: false, isolation: 'none' });
    let failed = false;
    let sawAnyTest = false;

    stream.on('test:fail', () => {
      failed = true;
    });

    // With isolation: 'none', the extension host never goes idle (it always
    // has other background work pending), so node:test never decides the
    // file has "finished" -- it emits test:complete for every test but never
    // test:summary/test:plan, and the stream never closes (bug, todo
    // 97779f964e, verified by tracing every stream event). So instead of
    // waiting for the stream to end, treat a short quiet period after the
    // last test:complete as "the file is done".
    let idleTimer: NodeJS.Timeout | undefined;
    const QUIET_PERIOD_MS = 1_000;

    stream.on('test:complete', () => {
      sawAnyTest = true;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(finish, QUIET_PERIOD_MS);
    });

    // A hard ceiling in case no test ever completes at all (a real hang,
    // as opposed to the expected missing completion signal above).
    const hardTimeout = setTimeout(() => {
      reject(new Error('extension-host tests timed out after 60s with no test:complete events'));
    }, 60_000);

    let finished = false;
    function finish(): void {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(hardTimeout);
      if (!sawAnyTest) {
        reject(new Error('no tests ran'));
      } else if (failed) {
        reject(new Error('One or more extension-host tests failed'));
      } else {
        resolve();
      }
    }

    stream.compose(new SpecReporter()).pipe(process.stdout);
  });
}
