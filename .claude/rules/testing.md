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
- UIの見た目（Webview）は、DOM操作のロジックをVSCode APIから切り離してテストできる形にする（画面を持たないテストで確かめられる部分を増やす）。`src/webview/shared/html.ts`の`renderShell`・`src/webview/controller.ts`はこの形で、`test/unit/`から本物のmtqgバイナリを使って呼べる（`test/unit/webview/controller.test.ts`）
- **`src/webview/client/`（Webview内で実際に動くスクリプト）は`node:test`の対象外。** DOM APIが無いNodeでは実行できない。ロジックはできる限り`controller.ts`・`shared/`側（ホスト、vscode非依存）に寄せて、そちらをテストする。`client/main.ts`自体は「動かして確かめる」で見る
- **`test/vscode/runTest.ts`は、`.mtqg/`を初期化した一時リポジトリをワークスペースとして開く**（`--disable-workspace-trust`と併用。信頼ダイアログがヘッドレス実行を止めないため）。ワークスペースが無いと`vscode.workspace.workspaceFolders`が空になり、`openPanel`（`src/webview/panel.ts`）の`FileSystemWatcher`・`controller`を作る分岐がテストで一度も通らない（todo`b9caf0b88c`で発見。それまでの`test/vscode/`はワークスペース無しで動いていた）

## この開発環境（devcontainer）固有の落とし穴

- **`ELECTRON_RUN_AS_NODE=1`がコンテナ全体の環境変数として立っている**（remote-cliの`code`シム用）。`@vscode/test-electron`がダウンロードするVS Code本体にこれが継承されると、そのElectronバイナリが素のNodeとして起動してしまい、`--extensionDevelopmentPath`などのCLIフラグがすべて「bad option」で失敗する。`qsokufile`の`test`ターゲットで`env -u ELECTRON_RUN_AS_NODE`を付けて対処している（不具合、todo`97779f964e`）
- **`trivy fs`は既定で`devDependencies`を無視する。** この拡張は実行時の依存が常に0なので、`--include-dev-deps`を付けないと何もスキャンされない（`qsokufile`の`trivy`ターゲットで対処済み）

## 壊して確かめる、という考え方

mtqgの`mutation-check`（実装を1か所ずつ壊してテストが落ちるかを見る）と同じ考え方を持ち込む：**通るだけのテストは、効いているとは限らない。** 今は実装が薄いので専用のSkillは作らず、区切りごとに手で確かめる。同じ手順を繰り返すようになったら、mtqgのSkillに倣って専用のスクリプトを作ることを検討する

## 動かして確かめる

- ロジック上正しそうに見えても、拡張開発ホストで実際に動かして初めて見つかる不具合はある。作業の区切りでは、テストに加えて実際に画面を開いて確かめる
- **Webviewの見た目は、`node:test`では確認できない**（CSPがスクリプトを止めていないか、`asWebviewUri`のパスが正しいか、実際にテーマ色が反映されるか、など）。この環境（Xvfb）でスクリーンショットを取って確かめる手順（todo`b9caf0b88c`で確立）：
  1. `Xvfb :N -screen 0 1280x800x24 &`（`env -u ELECTRON_RUN_AS_NODE`付き）
  2. ダウンロード済みのVS Code本体（`.vscode-test/vscode-linux-x64-*/code`）を`DISPLAY=:N`・`--extensionDevelopmentPath=<このリポジトリ>`・`--disable-gpu --disable-workspace-trust --no-sandbox --skip-welcome --skip-release-notes`・一時mtqgリポジトリのパス（ワークスペースとして開く）・`--remote-debugging-port=<port>`で起動（`--disable-extensions`は付けない。拡張自体も無効化されてしまう）
  3. コマンドパレット経由の操作はキー入力の自動化ツール（`xdotool`等）が無いため、`http://localhost:<port>/json`でCDPのターゲット一覧を取り、ページのWebSocketへ`Runtime.evaluate`でコマンドパレット相当の操作を直接実行する（例：オンボーディングダイアログのボタンをテキストで探してクリック）
  4. `import -window root -display :N <path>.png`（ImageMagick）でスクリーンショットを撮り、Readツールで見る
  5. **Webviewの中身（`vscode-webview://...`のiframe）はさらに`srcdoc`の入れ子フレームで、外側のCDPターゲットからは`document.querySelector`で直接触れない。** タブ切り替えなどWebview内の操作まで自動化したい場合は`Page.createIsolatedWorld`等でフレームの実行コンテキストを取る必要があり、コストが見合わなければ「スクリーンショットで見た目を確認する」だけに留めてよい（初回描画はこれで十分に確認できた）
  6. 確認後は起動したプロセス（`code`・`Xvfb`）を`kill`し、一時ディレクトリを削除する
- この手順は6画面それぞれのtodoで繰り返す見込み。同じ手順を素の状態から毎回組み立てるのはコストなので、繰り返す段階でSkill化を検討する（提案済み、todo`b9caf0b88c`）

## CI（予定）

- `.github/workflows/`はまだ無い。作るときは、mtqgと同じ考え方で複数OSを見る：VSCodeはWindows・macOS・Linuxで動くが、この拡張がOS依存な部分を持つとすれば`mtqg`実行ファイルの解決（Windowsは`mtqg.exe`）くらいのはずで、そこを確かめるテストは3OSで回す
