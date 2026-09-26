# テスト方針

## 使うツール（mtqgと同じ）

- **qsoku**：`qsokufile`ができたら、build・check・test・trivy・shellcheckの入口をmtqgと同じ形で用意する（`qsokufile`はコマンドの近道であり、シェルではなく`sh`で毎回同じに動く。詳細はqsoku自身のドキュメント）
- **Trivy**（`trivy.yaml`）：npmの依存の既知の脆弱性とライセンスを検査する。依存を足すたび・`package-lock.json`が変わるたびに通す
- **ShellCheck**：追跡中の`.sh`（`.devcontainer/postCreate.sh`、`.claude/hooks/`）にかける

## 拡張自身のテスト

- テストランナーは`node:test`（`.claude/rules/dependencies.md`）。VSCode APIを使うテストは`@vscode/test-cli`・`@vscode/test-electron`で拡張開発ホストを起動して行う
- mtqgとのつながり（`.claude/rules/mtqg-cli.md`）は、実際に`mtqg`のバイナリを子プロセスで起動して確かめる（mtqgのe2eが本物のバイナリと本物のgitを使うのと同じ考え方。モックで済ませない）
- UIの見た目（Webview）は、DOM操作のロジックをVSCode APIから切り離してテストできる形にする（画面を持たないテストで確かめられる部分を増やす）

## 壊して確かめる、という考え方

mtqgの`mutation-check`（実装を1か所ずつ壊してテストが落ちるかを見る）と同じ考え方を持ち込む：**通るだけのテストは、効いているとは限らない。** 今は実装が薄いので専用のSkillは作らず、区切りごとに手で確かめる。同じ手順を繰り返すようになったら、mtqgのSkillに倣って専用のスクリプトを作ることを検討する

## 動かして確かめる

- ロジック上正しそうに見えても、拡張開発ホストで実際に動かして初めて見つかる不具合はある。作業の区切りでは、テストに加えて実際に画面を開いて確かめる

## CI（予定）

- `.github/workflows/`はまだ無い。作るときは、mtqgと同じ考え方で複数OSを見る：VSCodeはWindows・macOS・Linuxで動くが、この拡張がOS依存な部分を持つとすれば`mtqg`実行ファイルの解決（Windowsは`mtqg.exe`）くらいのはずで、そこを確かめるテストは3OSで回す
