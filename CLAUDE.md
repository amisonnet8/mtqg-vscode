# CLAUDE.md

このファイルは mtqg-vscode プロジェクトで作業する際、Claude Code が常に踏まえるべき前提を示す。

## mtqg-vscodeとは

mtqg（**(m)emo & rules・(t)odo・(q)a & bugs・(g)lossary** を`.mtqg/journal.jsonl`に追記するCLIツール、`github.com/amisonnet8/mtqg`）を、人間が作業の流れの中で使うためのVSCode拡張。**記録作成のアシストと、状態・過程の表示に絞る**（mtqg設計§11.4）。

mtqg本体はGo製・CLIのみ。データの解釈・書き込みはすべてmtqg本体のCLIに任せ、この拡張は`--json`で呼び出す入口の1つに徹する（`.claude/rules/mtqg-cli.md`）。TypeScript・Node.jsのコードはこのリポジトリだけに置き、mtqg本体には持ち込まない。

## 参照すべきファイル

- **`docs/design/`** — **現状の設計**の記録（日本語）。決定に至った経緯・修正の履歴はここに書かず`.mtqg/`に記録する（決定、2026-09-28）。`vscode-extension.md`にmtqg設計§11.4の写しと、この拡張固有の未決事項がある
- **`.claude/rules/mtqg-usage.md`** — mtqgの使い方（記録者、種類の使い分け、こまめに記録する）。**このリポジトリに`PLAN.md`は無い。`mtqg context`が現状・今後を知るための一次情報**
- **`.claude/rules/mtqg-cli.md`** — mtqg本体とのつながり方（子プロセス起動、`--json`、エラーの扱い）
- **`.claude/rules/ui.md`** — UIの方針（英語・文字に頼らない、6画面、機能を足さない原則、レイアウト詳細は未定）
- **`.claude/rules/dependencies.md`** — npm依存の線引き
- **`.claude/rules/directory-structure.md`** — ディレクトリ構成と配置の判断基準
- **`.claude/rules/testing.md`** — テスト方針
- **`.claude/rules/naming.md`** — 命名規則（mtqgの用語対応表をそのまま使う）

これらのルールファイルは、実装中に得た気づき・教訓を育てていくものである。新しく気づいたルール・踏んだ落とし穴があれば、該当するファイルに追記すること。どのファイルにも当てはまらない新しい種類の気づきであれば、新しいルールファイルを作ってよい（作ったらこの一覧にも足すこと）。

## 開発の進め方

- **`PLAN.md`は使わない。mtqgで記録する。** `mtqg context`だけでこのリポジトリの現状・次にやることが分かる状態を保つ（`.claude/rules/mtqg-usage.md`）
- 実装後は`.claude/rules/testing.md`に従い、動作確認を行う
- 依存を足すときは`.claude/rules/dependencies.md`の線引きに従う

## 守ること（設計の芯）

- **役割外のものを足さない。** 新しいデータや操作を増やさず、すでにある記録を「書きやすく、見やすく」する（`.claude/rules/ui.md`「UIは豊かにするが、機能は足さない」）
- **データの解釈はmtqg本体のCLIに任せる。** `.mtqg/`の中を直接読み書きしない
- **UIは英語、文字に頼らない。** 色だけで意味を伝えない

## ドキュメントの言語

- **`CLAUDE.md`・`.claude/rules/`・`docs/design/`は日本語のみ**
- **コード・コメント・コミットメッセージ・UIの文言は英語**

## gitの扱い（Claude Codeの作業として）

- **pushは人間が行う。** Claude Codeはコミットまでで止めること。`git push`は`.claude/settings.json`で拒否（deny）されている
- 作業の区切りでこまめにコミットしてよい
- `git reset --hard`・`git clean`は、使う前に必ず理由を説明すること
- **Marketplaceへの公開（`vsce publish`）は人間が行う。** `.claude/settings.json`で拒否されている
- **コミット前に`git config user.email`／`user.name`を確認する。** このリポジトリの`.git/config`に、本来の設定（`amisonnet8`／`65074207+amisonnet8@users.noreply.github.com`、GitHubのプライバシー用noreplyアドレス）を上書きする`[user] name=demo email=a@b.c`が紛れ込んでいたことがあった（2026-09-26、原因不明の別セッション・別環境が同じ作業ディレクトリを操作した痕跡と推測。同時期にmtqgへも英語のテストデータが誤って登録されていた）。**修正時、ローカルの上書きを一度unsetしてグローバル設定（`amisonnet8@gmail.com`）にフォールバックさせてしまったが、これも本来このリポジトリで使うべきアドレスとは違っていた**（人間の指摘で発覚）。改めて`.git/config`にローカルで`user.email = 65074207+amisonnet8@users.noreply.github.com`・`user.name = amisonnet8`を設定し直した（グローバル設定は変更していない）。すでにpush済みの過去のコミット（`0557d6d`以降）はそのまま放置と決まっている（履歴の書き換え・force-pushはしない）が、**今後は同じことが再発しないよう、コミットする前に`git config user.email`を一度確認し、`65074207+amisonnet8@users.noreply.github.com`と違う値ならローカルの上書き（`.git/config`の`[user]`セクション）を疑う**

## 権限・自動化について

`.claude/settings.json`（人間が管理する）により、拒否・確認の設定がある。確認を求められた場合、無理に実行しようとせず、指示を仰ぐこと。

**`sandbox`設定（mtqg本体の`.claude/settings.json`を参考に2026-09-30導入）**：`filesystem.allowWrite`・`network.allowedDomains`等を許可した範囲内のBashコマンド（`npm ci`・`go install`・`qsoku trivy`等）は、`autoAllowBashIfSandboxed`により確認なしで実行できる。`network.allowedDomains`・`filesystem.allowWrite`を見直すときに踏んだ落とし穴は`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」にまとめてある。

ビルドの自動フック（`PostToolUse`）が設定されている。`.ts`・`package.json`・`tsconfig.json`を編集すると`.claude/hooks/build.sh`が走る（拡張の雛形ができるまでは何もしない）。

## ルール・スキルの提案

作業を進める中で、新しいルールにした方がよさそうな知見・Skill化した方が効率的そうな作業に気づいたら、都度こちらから提案すること（提案するだけで、勝手に作成・適用はしない）。

This repository records its development with mtqg: run `mtqg context` at the start of a session, and see `.mtqg/SCHEMA.md` for the data format.
