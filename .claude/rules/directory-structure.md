# ディレクトリ構成

`*`は初期構成（2026-09-26）・拡張の雛形（todo`97779f964e`）・CLI層（todo`cd0d242c55`）・Webviewの土台（todo`b9caf0b88c`）で作ったもの。それ以外は、後続のtodoで足す予定のもの。

```
mtqg-vscode/
*├── CLAUDE.md
*├── LICENSE
*├── .gitattributes
*├── .gitignore
*├── trivy.yaml
*├── .mtqg/
*├── .mcp.json
*├── docs/design/
*├── .devcontainer/
*│   ├── devcontainer.json
*│   └── postCreate.sh
*├── .claude/
*│   ├── rules/
*│   ├── hooks/
*│   └── settings.json
*├── qsokufile                （build・unit・check・test・trivy・shellcheck・package）
*├── package.json / package-lock.json / tsconfig.json / .vscodeignore
*├── src/
*│   ├── extension.ts        （拡張のエントリポイント。コマンドmtqg.openの登録のみ）
*│   ├── mtqg/                （mtqgを子プロセスで呼ぶコード。.claude/rules/mtqg-cli.md）
*│   └── webview/
*│       ├── panel.ts        （WebviewPanelを1つ開く／revealする。vscodeを触るのはここだけ）
*│       ├── controller.ts   （vscode非依存。Webviewからのメッセージ→mtqg呼び出し→render送信の一連。node:testで本物のmtqgを使って確認）
*│       ├── screens.ts      （タブごとのHTML断片を組む。今は全タブ共通のプレースホルダ、各画面のtodoがここに足す）
*│       ├── shared/          （6画面共通、vscode非依存。node:testで確認できる）
*│       │   ├── html.ts     （renderShell：CSP・タブバー・タブパネルの外枠）
*│       │   ├── tabs.ts     （6画面のID・ラベル・既定タブ）
*│       │   ├── messages.ts （ホスト⇔Webviewのメッセージの型と検証）
*│       │   └── escape.ts   （HTMLへ差し込む前のエスケープ）
*│       └── client/          （Webview内で動く固定スクリプト。DOM型・ブラウザESM出力のため別tsconfig）
*│           ├── main.ts
*│           └── tsconfig.json
*├── test/
*│   ├── unit/                （node:test。VSCode APIを使わないテスト）
*│   │   ├── mtqg/
*│   │   └── webview/
*│   ├── helpers/tempRepo.ts  （git init＋mtqg initした一時リポジトリ）
*│   └── vscode/              （@vscode/test-electronで拡張開発ホストを起動するテスト。.claude/rules/testing.md）
*│       ├── runTest.ts      （一時mtqgリポジトリをワークスペースとして開く）
*│       └── suite/
*├── .vscode/
*│   ├── launch.json          （F5で拡張開発ホストを起動）
*│   └── tasks.json           （tsc -wのバックグラウンドタスク）
 └── .github/workflows/       （予定：CI、todo`53cbaa3265`）
```

## 配置の判断基準

- **mtqgを呼ぶコードは`src/mtqg/`に集める。** 呼び出し（`child_process.execFile`、引数の組み立て、`--json`の結果の型付け）をここ以外に散らさない（`.claude/rules/mtqg-cli.md`「入口ごとに状態の組み立てを重複させない」）
- **HTMLはホスト側（Node）で組む。Webview側は組み立てない。**（q&a`0736e37fd7`）。バンドラ無し・実行時依存0の制約下で、ロジックをすべて`node:test`で試せるようにするため。拡張ホストが`src/webview/screens.ts`でタブごとのHTML文字列を組み、`src/webview/controller.ts`が`render`メッセージとしてWebviewへ送る。Webview側の`src/webview/client/main.ts`は、受け取った断片を`innerHTML`に差し込み、クリックを`selectTab`としてホストへ伝えるだけの小さな固定スクリプト（インラインのイベントハンドラは使わずイベント委譲＋`data-tab`属性で、CSPの`script-src`を緩めない）
- **画面ごとの中身は`src/webview/screens.ts`の`renderScreen(tab, client)`に足す。** タブという横串の構造（`shared/tabs.ts`）と、画面ごとのレイアウトを分けている
- **`vscode`を触るのは`src/webview/panel.ts`だけ。** `controller.ts`・`screens.ts`・`shared/`はvscode非依存にし、本物のmtqgバイナリを使う`node:test`で試す（`.claude/rules/testing.md`）
- **Webview内で実際に動くスクリプト（`src/webview/client/`）は別tsconfig。** ホスト側はCommonJS（`vscode`の型）、Webview側はDOM型・ブラウザ向けESM出力で、1つのtsconfigでは両立しない（バンドラを使わない方針、`.claude/rules/dependencies.md`）。ルートの`tsconfig.json`は`src/webview/client`を`exclude`する
- **`src/extension.ts`は薄く保つ。** コマンドの登録とWebviewパネルの起動だけを行い、ロジックは`src/mtqg/`・`src/webview/`に置く
- **`docs/design/`**：設計判断と理由の記録（日本語）。mtqg設計§11.4からの引き継ぎと、このリポジトリ側で新たに決めたことを書く。仕様と食い違う場合はコード（と、あれば`docs/reference/`相当の文書）が正、という考え方はmtqgと同じ
- **`.mtqg/`の中のファイルを直接編集しない。** すべてmtqgのコマンド経由（`.claude/rules/mtqg-usage.md`）
