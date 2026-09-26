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
- **記録の本文を確かめるテストは、部分一致（`assert.match`で含むかだけ見る）ではなく完全一致（`assert.equal`）にする。** `client.ts`の`edit`・`glossaryAdd`・`qaAnswer`・`bugReply`が本文の前に余計な`--`を混入させる不具合（`.claude/rules/mtqg-cli.md`）を、まさに部分一致のテストがすり抜けさせていた（`"-- foo"`は`/foo/`にマッチしてしまう）。todo`daf43fc83d`で、人間が実際にUIを操作して初めて発覚した

## 動かして確かめる

- ロジック上正しそうに見えても、拡張開発ホストで実際に動かして初めて見つかる不具合はある。作業の区切りでは、テストに加えて実際に画面を開いて確かめる
- **人間がこのdevcontainerに接続したデスクトップ版VS Codeで`F5`（デバッグ実行）すると、拡張機能ホストが起動直後に固まることがある**（`--inspect-brk`でデバッガの接続を待つ状態のまま、リモート経由だと接続が来ず、コマンドが一つも登録されない＝「not found」になる。todo`daf43fc83d`で人間が遭遇）。**`Ctrl+F5`（Run Without Debugging）を使えば、デバッガの接続を待たずに起動できる。** F5を繰り返すと固まったプロセス（`ps aux | grep inspect-brk.*extensionHost`）が溜まるので、必要なら`kill -9`で片付ける
- **Webviewの見た目は、`node:test`では確認できない**（CSPがスクリプトを止めていないか、`asWebviewUri`のパスが正しいか、実際にテーマ色が反映されるか、など）。この環境（Xvfb）でスクリーンショットを取って確かめる手順（todo`b9caf0b88c`で確立）：
  1. `Xvfb :N -screen 0 1280x800x24 &`（`env -u ELECTRON_RUN_AS_NODE`付き）
  2. ダウンロード済みのVS Code本体（`.vscode-test/vscode-linux-x64-*/code`）を`DISPLAY=:N`・`--extensionDevelopmentPath=<このリポジトリ>`・`--disable-gpu --disable-workspace-trust --no-sandbox --skip-welcome --skip-release-notes`・一時mtqgリポジトリのパス（ワークスペースとして開く）・`--remote-debugging-port=<port>`で起動（`--disable-extensions`は付けない。拡張自体も無効化されてしまう）
  3. コマンドパレット経由の操作はキー入力の自動化ツール（`xdotool`等）が無いため、`http://localhost:<port>/json`でCDPのターゲット一覧を取り、ページ（`type: "page"`）のWebSocketへ`Runtime.evaluate`でDOM操作を直接実行する（例：オンボーディングダイアログのボタンをテキストで探してクリック）。実際のキー入力そのものが要る場面（コマンドパレットを開いて`mtqg: Open`や`Developer: Reload Window`を打つなど）は、同じWebSocketへ`Input.dispatchKeyEvent`（`rawKeyDown`→`keyUp`の組、文字送りは`type: 'keyDown', text: <1文字>`→`keyUp`）を送る——`document.dispatchEvent(new KeyboardEvent(...))`のようなDOM合成イベントはVS Codeのキーバインド処理には拾われない（`isTrusted`が立たないため）。ホストの拡張コードを直した後は、ウィンドウを開き直すのではなく同じ拡張開発ホストで`Developer: Reload Window`を打てば、ビルドし直した`out/`を読み直せる（todo`4e09f42a9f`で確立、Node 22の組み込み`WebSocket`クライアントでこの一連を書けた）
  4. `import -window root -display :N <path>.png`（ImageMagick）でスクリーンショットを撮り、Readツールで見る
  5. **Webviewの中身は、CDPターゲット一覧の`type: "iframe"`（`vscode-webview://...`、外側のラッパー）に接続し、そこから`document.querySelector('iframe').contentDocument`でもう一段入るとタブの中身に触れる**（同一オリジンなので、これで直接アクセスできる。訂正：todo`b9caf0b88c`時点では`srcdoc`で隔離されクロスオリジン扱いだろうと考えていたが、実際は同一オリジンで、単に一段ネストしているだけだった。VS Codeの外側ワークベンチ（`type: "page"`）から直接`document.querySelector('iframe')`しても見つからない＝そちらではなく`iframe`ターゲット側から辿ること）。クリックだけでなく、`contenteditable`な要素の`textContent`を書き換えてから`element.dispatchEvent(new Event('focusout', {bubbles:true}))`のように合成イベントを飛ばせば、実際にフォーカスを移動させなくても入力→確定の一連を再現できる。同じ`Runtime.evaluate`呼び出しを繰り返すと`const`の再宣言でエラーになるので、実行するスクリプトは`(() => { ... })()`のIIFEで包む
  6. 確認後は起動したプロセス（`code`・`Xvfb`）を`kill`し、一時ディレクトリを削除する（`pkill`はこの環境のサンドボックスで通らないことがある。`ps aux`で対象のPIDを見つけ、`kill -9 <pid...>`で個別に殺す方が安定する）
- この手順は6画面それぞれのtodoで繰り返す見込み。同じ手順を素の状態から毎回組み立てるのはコストなので、繰り返す段階でSkill化を検討する（提案済み、todo`b9caf0b88c`）

## CI（予定）

- `.github/workflows/`はまだ無い。作るときは、mtqgと同じ考え方で複数OSを見る：VSCodeはWindows・macOS・Linuxで動くが、この拡張がOS依存な部分を持つとすれば`mtqg`実行ファイルの解決（Windowsは`mtqg.exe`）くらいのはずで、そこを確かめるテストは3OSで回す
