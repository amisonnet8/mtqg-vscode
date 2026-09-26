# 設計判断の記録

このディレクトリは、mtqg-vscode（VSCode拡張）の設計判断と、その理由を記録する。「なぜこうなっているか」はここにある。

## mtqg本体の設計との関係

このリポジトリの生まれた経緯（VSCode拡張を別リポジトリにする判断、置き場所、順序）は、mtqg本体のリポジトリ（`github.com/amisonnet8/mtqg`）の設計文書とmtqgの記録に残っている：

- `docs/design/07-integrations.md` §11.4（画面構成・実装方針の元の設計）
- `.mtqg/`の質問`08b09858fc`・memo`d48b4a55b5`（着手の決定、置き場所の決定）
- コミット`5662e8d`（この経緯を記録した時点）

**このリポジトリの誕生以降の設計判断は、ここ（`mtqg-vscode/docs/design/`）とこのリポジトリの`.mtqg/`に残す。** mtqg本体の`PLAN.md`やmtqg本体の`.mtqg/`には残らない（このリポジトリは`PLAN.md`を使わず、`mtqg context`が一次情報。`.claude/rules/mtqg-usage.md`）。

## ファイル

| ファイル | 内容 |
|---|---|
| `01-vscode-extension.md` | mtqg設計§11.4の写しと、この拡張固有の未決事項 |
