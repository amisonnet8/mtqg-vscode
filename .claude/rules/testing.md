# テスト方針

## 使うツール（mtqgと同じ）

- **qsoku**：`qsokufile`ができたら、build・check・test・trivy・shellcheckの入口をmtqgと同じ形で用意する（`qsokufile`はコマンドの近道であり、シェルではなく`sh`で毎回同じに動く。詳細はqsoku自身のドキュメント）
- **Trivy**（`trivy.yaml`）：npmの依存の既知の脆弱性とライセンスを検査する。依存を足すたび・`package-lock.json`が変わるたびに通す
- **ShellCheck**：追跡中の`.sh`（`.devcontainer/postCreate.sh`、`.claude/hooks/`）にかける

## 拡張自身のテスト

- テストランナーは`node:test`（`.claude/rules/dependencies.md`）。VSCode APIを使わないテスト（`test/unit/`）はそのまま`node --test`で走る
- **VSCode APIを使うテスト（`test/vscode/`）は、`@vscode/test-electron`で拡張開発ホストを起動し、その中で`node:test`の`run()`を呼ぶ**（`@vscode/test-cli`は使わない。mochaを内部で使うため）。`test/vscode/runTest.ts`が起動元、`test/vscode/suite/index.ts`が`run()`を呼ぶ側
  - `run()`には`isolation: 'none'`を渡す。既定（`'process'`）は各テストファイルを子プロセスで実行するが、子プロセスには拡張開発ホストが注入する`vscode`モジュールが無い
  - **`isolation: 'none'`にすると、テストの完了を`stream`の`finished`イベントで検知できない。** 拡張開発ホストのような常駐プロセスは常に何かのバックグラウンド処理を抱えていて「何もしていない」状態にならないため、node:testが使う待機（アイドル検知）が成立せず、`test:complete`は個々のテストごとに発火するのに`test:summary`・`test:plan`は発火しない（不具合、todo`97779f964e`で発見・記録）。代わりに、`test:complete`が一定時間（1秒）止んだら「そのファイルは完了した」とみなす方式にする（`test/vscode/suite/index.ts`）
- mtqgとのつながり（`.claude/rules/mtqg-cli.md`）は、実際に`mtqg`のバイナリを子プロセスで起動して確かめる（mtqgのe2eが本物のバイナリと本物のgitを使うのと同じ考え方。モックで済ませない）
- UIの見た目（Webview）は、DOM操作のロジックをVSCode APIから切り離してテストできる形にする（画面を持たないテストで確かめられる部分を増やす）。`src/webview/shared/html.ts`の`renderShell`はこの形で、`test/unit/`から呼べる

## この開発環境（devcontainer）固有の落とし穴

- **`ELECTRON_RUN_AS_NODE=1`がコンテナ全体の環境変数として立っている**（remote-cliの`code`シム用）。`@vscode/test-electron`がダウンロードするVS Code本体にこれが継承されると、そのElectronバイナリが素のNodeとして起動してしまい、`--extensionDevelopmentPath`などのCLIフラグがすべて「bad option」で失敗する。`qsokufile`の`test`ターゲットで`env -u ELECTRON_RUN_AS_NODE`を付けて対処している（不具合、todo`97779f964e`）
- **`trivy fs`は既定で`devDependencies`を無視する。** この拡張は実行時の依存が常に0なので、`--include-dev-deps`を付けないと何もスキャンされない（`qsokufile`の`trivy`ターゲットで対処済み）

## 壊して確かめる、という考え方

mtqgの`mutation-check`（実装を1か所ずつ壊してテストが落ちるかを見る）と同じ考え方を持ち込む：**通るだけのテストは、効いているとは限らない。** 今は実装が薄いので専用のSkillは作らず、区切りごとに手で確かめる。同じ手順を繰り返すようになったら、mtqgのSkillに倣って専用のスクリプトを作ることを検討する

## 動かして確かめる

- ロジック上正しそうに見えても、拡張開発ホストで実際に動かして初めて見つかる不具合はある。作業の区切りでは、テストに加えて実際に画面を開いて確かめる

## CI（予定）

- `.github/workflows/`はまだ無い。作るときは、mtqgと同じ考え方で複数OSを見る：VSCodeはWindows・macOS・Linuxで動くが、この拡張がOS依存な部分を持つとすれば`mtqg`実行ファイルの解決（Windowsは`mtqg.exe`）くらいのはずで、そこを確かめるテストは3OSで回す
