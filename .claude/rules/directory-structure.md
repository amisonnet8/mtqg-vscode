# ディレクトリ構成

`*`は初期構成（2026-09-26）または拡張の雛形（todo`97779f964e`、2026-09-26）で作ったもの。それ以外は、後続のtodoで足す予定のもの。

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
 │   ├── mtqg/                （予定：mtqgを子プロセスで呼ぶコードをここに集める。.claude/rules/mtqg-cli.md、todo`cd0d242c55`）
*│   └── webview/
*│       ├── panel.ts        （WebviewPanelを1つ開く／revealする）
 │       └── shared/          （予定：6画面共通のスタイル・ユーティリティ、todo`b9caf0b88c`）
*│           └── html.ts     （renderShell：CSP付きの外枠。VSCode APIから独立、node:testで確認できる）
*├── test/
*│   ├── unit/                （node:test。VSCode APIを使わないテスト）
*│   └── vscode/              （@vscode/test-electronで拡張開発ホストを起動するテスト。.claude/rules/testing.md）
*│       ├── runTest.ts
*│       └── suite/
*├── .vscode/
*│   ├── launch.json          （F5で拡張開発ホストを起動）
*│   └── tasks.json           （tsc -wのバックグラウンドタスク）
 └── .github/workflows/       （予定：CI、todo`53cbaa3265`）
```

## 配置の判断基準

- **mtqgを呼ぶコードは`src/mtqg/`に集める。** 呼び出し（`child_process.execFile`、引数の組み立て、`--json`の結果の型付け）をここ以外に散らさない（`.claude/rules/mtqg-cli.md`「入口ごとに状態の組み立てを重複させない」）
- **画面ごとのUIコードは`src/webview/`に、画面の名前でディレクトリを分ける**（`todo/`・`qa/`・`bug/`・`rule/`・`glossary/`・`memo/`）。共通のスタイル・ユーティリティは`src/webview/shared/`に置く
- **`src/extension.ts`は薄く保つ。** コマンドの登録とWebviewパネルの起動だけを行い、ロジックは`src/mtqg/`・`src/webview/`に置く
- **`docs/design/`**：設計判断と理由の記録（日本語）。mtqg設計§11.4からの引き継ぎと、このリポジトリ側で新たに決めたことを書く。仕様と食い違う場合はコード（と、あれば`docs/reference/`相当の文書）が正、という考え方はmtqgと同じ
- **`.mtqg/`の中のファイルを直接編集しない。** すべてmtqgのコマンド経由（`.claude/rules/mtqg-usage.md`）
