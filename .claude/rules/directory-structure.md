# ディレクトリ構成

`*`は初期構成（2026-09-26）で作ったもの。それ以外は、拡張の雛形を作るときに足す予定のもの。

```
mtqg-vscode/
*├── CLAUDE.md
*├── LICENSE
*├── .gitattributes
*├── .gitignore              （settings.local.jsonのみ。npm系は雛形と一緒に足す）
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
 ├── qsokufile               （予定：build・check・test・trivy・shellcheck・package）
 ├── package.json / package-lock.json / tsconfig.json / .vscodeignore
 ├── src/
 │   ├── extension.ts        （拡張のエントリポイント）
 │   ├── mtqg/                （mtqgを子プロセスで呼ぶコードをここに集める。.claude/rules/mtqg-cli.md）
 │   └── webview/              （6画面のUI：todo・qa・bug・rule・glossary・memo。.claude/rules/ui.md）
 ├── test/                    （node:test）
 ├── .vscode/                 （launch.json。F5での拡張開発ホスト起動。拡張開発の慣習として、雛形を作るときに判断する）
 └── .github/workflows/
```

## 配置の判断基準

- **mtqgを呼ぶコードは`src/mtqg/`に集める。** 呼び出し（`child_process.execFile`、引数の組み立て、`--json`の結果の型付け）をここ以外に散らさない（`.claude/rules/mtqg-cli.md`「入口ごとに状態の組み立てを重複させない」）
- **画面ごとのUIコードは`src/webview/`に、画面の名前でディレクトリを分ける**（`todo/`・`qa/`・`bug/`・`rule/`・`glossary/`・`memo/`）。共通のスタイル・ユーティリティは`src/webview/shared/`に置く
- **`src/extension.ts`は薄く保つ。** コマンドの登録とWebviewパネルの起動だけを行い、ロジックは`src/mtqg/`・`src/webview/`に置く
- **`docs/design/`**：設計判断と理由の記録（日本語）。mtqg設計§11.4からの引き継ぎと、このリポジトリ側で新たに決めたことを書く。仕様と食い違う場合はコード（と、あれば`docs/reference/`相当の文書）が正、という考え方はmtqgと同じ
- **`.mtqg/`の中のファイルを直接編集しない。** すべてmtqgのコマンド経由（`.claude/rules/mtqg-usage.md`）
