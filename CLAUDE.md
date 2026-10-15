# CLAUDE.md

このファイルは mtqg-vscode プロジェクトで作業する際、Claude Code が常に踏まえるべき前提を示す。

## mtqg-vscodeとは

mtqg（**(m)emo & rules・(t)odo・(q)a & bugs・(g)lossary** を`.mtqg/journal.jsonl`に追記するCLIツール、`github.com/amisonnet8/mtqg`）を、人間が作業の流れの中で使うためのVSCode拡張。**記録作成のアシストと、状態・過程の表示に絞る**（mtqg設計§11.4）。

mtqg本体はGo製・CLIのみ。データの解釈・書き込みはすべてmtqg本体のCLIに任せ、この拡張は`--json`で呼び出す入口の1つに徹する（`.claude/rules/mtqg-cli.md`）。TypeScript・Node.jsのコードはこのリポジトリだけに置き、mtqg本体には持ち込まない。

## 参照すべきファイル

作業を始める前に、以下を確認すること。

- **`docs/design/`** — **現状の設計**の記録（日本語）。決定に至った経緯・修正の履歴はここに書かず`.mtqg/`に記録する（決定、2026-09-28）。`vscode-extension.md`にmtqg設計§11.4の写しと、この拡張固有の未決事項がある
- **`.claude/rules/bcuz-usage.md`** — bcuzの使い方。**Bashで実行するコマンドは、必ず`bcuz "理由" コマンド…`の形で打つ**（フックが、そうでないものを断る）。理由は「なぜ」を書く。**コマンドを打つ前に読む**
- **`.claude/rules/mtqg-usage.md`** — mtqgの使い方（記録者、種類の使い分け、こまめに記録する）。**このリポジトリに`PLAN.md`は無い。`mtqg context`が現状・今後を知るための一次情報**
- **`.claude/rules/srwr-usage.md`** — srwrの使い方（**厳格モード**）。**このリポジトリでは`Edit`・`Write`が禁止されており、ファイルの変更は`look`／`edit`／`new`（理由`why`つき）で行う。作業のまとまりごとに`session`で題つきのテープを始め、コミットの前にテープを閉じる。ファイルを変える前に読む**
- **`.claude/rules/qsoku-usage.md`** — qsokuの使い方（`qsokufile`の名前の一覧、呼び方、書式、`//`、シェル連携）。**ビルド・テストは`npx tsc`・`node --test`などを直接打たず、ここの名前で実行する**
- **`.claude/rules/mtqg-cli.md`** — mtqg本体とのつながり方（子プロセス起動、`--json`、エラーの扱い）
- **`.claude/rules/ui.md`** — UIの方針（英語・文字に頼らない、6画面、機能を足さない原則、レイアウト詳細は未定）
- **`.claude/rules/dependencies.md`** — npm依存の線引き
- **`.claude/rules/directory-structure.md`** — ディレクトリ構成と、ファイルの置き場所の判断基準。**新しいファイルを追加するときに読む**
- **`.claude/rules/testing.md`** — テスト方針（拡張のテスト、動かして確かめる手順、Bashサンドボックス・CIの落とし穴）
- **`.claude/rules/datetime.md`** — 日時の扱い（データは UTC で持ち、表示だけ利用者のタイムゾーンに直す。瞬間で比べる、時計を差し替える）。**日時を保存・表示・比較するコードを書くときに読む（mtqgの記録の日時を表示する画面も含む）**
- **`.claude/rules/working-with-human.md`** — 人間とのやり取り（頼み方の3種類、小さなつまずきの頼み方、確認の自動化、見え方を変えるときの了承）。**人間に何かを頼む前に読む**
- **`.claude/rules/naming.md`** — 命名規則（mtqgの用語対応表をそのまま使う）
- **`.claude/rules/distribution.md`** — 配布方法（Marketplaceへの公開は人間、リリースの流れ）
- **`.claude/rules/documentation.md`** — ドキュメントの書き方（`docs/design/`に書く経緯の線引き。そのほかは未記入で、決まったら書く）

これらのルールファイルは、実装中に得た細かい気づき・教訓をClaude Code自身が育てていくものである。新しく気づいたルール・踏んだ落とし穴があれば、該当するファイルに追記すること。どのファイルにも当てはまらない新しい種類の気づきであれば、新しいルールファイルを作ってよい（作ったらこの一覧にも足すこと）。

## 開発の進め方

- **`PLAN.md`は使わない。mtqgで記録する。** `mtqg context`だけでこのリポジトリの現状・次にやることが分かる状態を保つ（`.claude/rules/mtqg-usage.md`）
- **Bashのコマンドは、すべて`bcuz "理由" コマンド…`で実行する**（`bcuz "lintの確認" qsoku lint`）。理由は「何をするか」でなく「なぜするか」。`bcuz`で始まらない・`&&`や`;`でつなぐコマンドは、`.claude/settings.json`の`PreToolUse`フック（`.claude/hooks/require-bcuz.sh`）が実行前に断る。**`git commit`だけは`bcuz`を通さない**（通すとコミットの後に記録が増えるため。理由はコミットメッセージに書く）。実行の記録は`.bcuz/history.jsonl`に残り（コミットする）、`bcuz -H`で見られる。**トークンなどの秘密を、コマンドの引数・`env`の指定・理由に書かない**（記録に残り、コミットされる）（`.claude/rules/bcuz-usage.md`）
- **ファイルの変更は、srwrの道具（`look`で見て`edit`、新規は`new`）で行い、すべてに理由（`why`）を添える。** 組み込みの`Edit`・`Write`は`.claude/settings.json`で禁止されている（厳格モード）。Bashでの書き換え（`sed -i`・リダイレクト）もしない
- **作業のまとまり（todo・bug・人間の依頼・作業の種類の変わり目）ごとに、最初に`session`で題つきのテープを始める。** 1つの作業＝1本のテープ、コミットも同じ区切り（`.claude/rules/srwr-usage.md`「セッション」）
- **コミットの前に、テープを閉じる**（`srwr tapes check`のあと`srwr tapes new`）。書き込み中の生のテープは`.gitignore`で対象外で、閉じて圧縮した`.srwr/tapes/*.tape.jsonl.gz`だけがgitに入る（`.claude/rules/srwr-usage.md`）
- 実装後は`.claude/rules/testing.md`に従い、ビルド確認に加えて実際の動作確認（`bcuz "…" qsoku check`、必要に応じて`qsoku test`・`qsoku trivy`・`qsoku shellcheck`）を行うこと。判断に迷ったら実行する側に倒すこと
- 依存を足すときは`.claude/rules/dependencies.md`の線引きに従う。足したら、Trivyでライセンス・脆弱性を確認すること（`qsoku trivy`）

## 守ること（設計の芯）

実装の細部より優先する。これを崩す変更は、実装する前に必ず相談すること。

- **役割外のものを足さない。** 新しいデータや操作を増やさず、すでにある記録を「書きやすく、見やすく」する（`.claude/rules/ui.md`「UIは豊かにするが、機能は足さない」）
- **データの解釈はmtqg本体のCLIに任せる。** `.mtqg/`の中を直接読み書きしない
- **UIは英語、文字に頼らない。** 色だけで意味を伝えない

## ドキュメントの言語

- **`CLAUDE.md`・`.claude/rules/`・`docs/design/`は日本語のみ**
- **コード・コメント・コミットメッセージ・UIの文言は英語**

## gitの扱い（Claude Codeの作業として）

- **pushは人間が行う。** Claude Codeはコミットまでで止めること。`git push`は`.claude/settings.json`で拒否（deny）されている
- 作業の区切りでこまめにコミットしてよい（消してしまったときに戻せるように）
- `git reset --hard`・`git clean`は、コミットしていない作業を消すので、使う前に必ず理由を説明すること
- **Marketplaceへの公開（`vsce publish`）は人間が行う。** `.claude/settings.json`で拒否されている
- **コミット前に`git config user.email`／`user.name`を確認する。** このリポジトリの`.git/config`に、本来の設定（`amisonnet8`／`65074207+amisonnet8@users.noreply.github.com`、GitHubのプライバシー用noreplyアドレス）を上書きする`[user] name=demo email=a@b.c`が紛れ込んでいたことがあった（2026-09-26、原因不明の別セッション・別環境が同じ作業ディレクトリを操作した痕跡と推測。同時期にmtqgへも英語のテストデータが誤って登録されていた）。**修正時、ローカルの上書きを一度unsetしてグローバル設定（`amisonnet8@gmail.com`）にフォールバックさせてしまったが、これも本来このリポジトリで使うべきアドレスとは違っていた**（人間の指摘で発覚）。改めて`.git/config`にローカルで`user.email = 65074207+amisonnet8@users.noreply.github.com`・`user.name = amisonnet8`を設定し直した（グローバル設定は変更していない）。すでにpush済みの過去のコミット（`0557d6d`以降）はそのまま放置と決まっている（履歴の書き換え・force-pushはしない）が、**今後は同じことが再発しないよう、コミットする前に`git config user.email`を一度確認し、`65074207+amisonnet8@users.noreply.github.com`と違う値ならローカルの上書き（`.git/config`の`[user]`セクション）を疑う**

## 権限・自動化について

`.claude/settings.json`（人間が管理する）により、次の設定になっている。

- 拒否（deny）：`git push`、`gh pr merge`、`gh release create`、`vsce publish`
- **`bcuz`を通さないBashコマンドの拒否**：`PreToolUse`フック（`.claude/hooks/require-bcuz.sh`）が、`bcuz`で始まらないコマンド（`git commit`を除く。逆に`bcuz`を通した`git commit`を断る）と、後ろに別のコマンドをつなぐもの（`&&`・`||`・`;`・`&`・改行・コマンド置換）を、実行前に断る。直し方は断りのメッセージと`.claude/rules/bcuz-usage.md`に書いてある
- 実行前に確認（ask）：`git reset --hard`、`git clean`、`sudo`、`gh pr create`
- **Bashコマンドは既定でOSレベルのサンドボックス（Linux bubblewrap）内で実行される。** ファイルシステムの書き込み先とネットワーク接続先は許可リストで絞られている。この範囲内なら`curl`・`wget`・`npm ci`・`go install`などは確認なしに実行できる。リストに無い宛先・書き込み先は`sandbox_violations`として拒否される。そのときは、`.claude/rules/working-with-human.md` 2章の形（原因と、`.claude/settings.json` のどこに何を足すか）で**短く頼む**（許可を広げるかは人間が判断する）。落とし穴は`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」参照

確認を求められた場合、無理に実行しようとしない。`.claude/settings.json`を変更したいときは、変更案を差分で示すにとどめること（人間が貼るだけで済む形にする）。

**`sandbox`設定（mtqg本体の`.claude/settings.json`を参考に2026-09-30導入）**：`filesystem.allowWrite`・`network.allowedDomains`等を許可した範囲内のBashコマンド（`npm ci`・`go install`・`qsoku trivy`等）は、`autoAllowBashIfSandboxed`により確認なしで実行できる。`network.allowedDomains`・`filesystem.allowWrite`を見直すときに踏んだ落とし穴は`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」にまとめてある。

**srwrの厳格モード**（2026-10-11導入）：`permissions.deny`に`Edit`・`Write`・`MultiEdit`・`NotebookEdit`があり、`.mcp.json`にsrwrのMCPサーバー、`PostToolUse`に`srwr hook`（読み取りと外部変更の記録）がある。テープ（`.srwr/tapes/`）はgitで共有する（鍵`.srwr/key`は入れない）。許可を広げるのは人間の判断で、`.claude/settings.json`を変えたいときは差分で示す。詳細は`.claude/rules/srwr-usage.md`。

ビルドの自動フック（`PostToolUse`）が設定されている。srwrの`edit`・`new`で`.ts`・`package.json`・`tsconfig.json`を変えると`.claude/hooks/build.sh`が走る（拡張の雛形ができるまでは何もしない）。失敗すると理由がClaude Codeに返る。複数ファイルにまたがる編集の途中は、まだ書いていないファイルを参照して一時的に失敗することがある。

## mtqgでの記録について

作業の中で生まれる「気づき・やること・質問と答え・不具合とそのやり取り・用語の合意・この先も効き続ける決まり事」は、コードにもコミットにも残らず、チャットの履歴やメモアプリに散って失われやすい。`mtqg`（`m`emo & rules・`t`odo・`q`a & bugs・`g`lossary）はそれを`.mtqg/journal.jsonl`に追記し、gitに乗せて共有する。使い方は`.claude/rules/mtqg-usage.md`。`.mtqg/`には決まり事（rule）を10件登録済み——`mtqg context`で確認できる。AIエージェントからは、フック（`.claude/settings.json`の`mtqg hook`）とMCPサーバー（`.mcp.json`の`mtqg mcp`）の両方で使える。

## ルール・スキルの提案

作業を進める中で、以下に気づいたら、都度こちらから提案すること（提案するだけで、勝手に作成・適用はしない。判断はこちらが行う）。

- **新しいルールにした方がよさそうな知見**: 同じ種類の判断や落とし穴に複数回遭遇した、既存の`.claude/rules/`のどれにも当てはまらない、といった場合。どのファイルに追記すべきか、あるいは新規ファイルが必要かも合わせて提案する
- **Skill化した方が効率的そうな作業**: 「同じ手順を3回目繰り返している」など、パターン化できそうな一連の作業に気づいた場合。まだ実装が薄い段階では無理に提案する必要はない。パターンが実際に繰り返されてから提案すること

提案は気づいたタイミングで随時行ってよく、まとめて報告するために貯めておく必要はない。

This repository records its development with mtqg: run `mtqg context` at the start of a session, and see `.mtqg/SCHEMA.md` for the data format.
