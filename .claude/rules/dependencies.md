# 依存ライブラリの方針

mtqg本体の「標準ライブラリと`golang.org/x/`だけ」（mtqgの`CLAUDE.md`）に相当する、この拡張のための線引き。

## 実行時の依存は0

- 拡張本体（VSCode拡張ホスト側）とWebview側のUIは、npmパッケージに依存しない素のTypeScript/HTML/CSSで書く。ReactやVueなどのUIフレームワークを足さない
- VSCode APIそのもの（`vscode`モジュール）はホストが提供するので依存に数えない

## 開発時の依存はMicrosoft公式＋TypeScriptのみ

- `typescript`（コンパイラ）
- `@types/vscode`・`@types/node`（型定義、Microsoft/DefinitelyTyped）
- `@vscode/vsce`（パッケージング・公開ツール、Microsoft公式）
- `@vscode/test-cli`・`@vscode/test-electron`（拡張のテスト、Microsoft公式）
- テストランナーはNode.js組み込みの`node:test`を使う（追加のテストフレームワークを入れない）

## それ以外を足すとき

- 「どうしても必要な場合」の例外として扱う。①上のリストに無い、または②自前で書くと量が多く正しさ・安全性の確認が難しい、のどちらかを説明して人間に確認を取り、理由をmtqgに記録する（`m add`または`r add`。mtqgの`CLAUDE.md`と同じ手続き）
- 追加したら`qsoku trivy`でライセンス（MITと衝突しないか）と既知の脆弱性を確認する
