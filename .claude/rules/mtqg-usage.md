# mtqgの使い方（このリポジトリでは最初から）

このリポジトリはmtqg自身の開発過程を`.mtqg/`に記録する（mtqgリポジトリと同じく段階4からの運用を、最初から採用する）。**`PLAN.md`は使わない。`mtqg context`が唯一の一次情報**であり、これだけでこのリポジトリの現状・次にやることが分かる状態を保つ。

使う`mtqg`は、`go install github.com/amisonnet8/mtqg/cmd/mtqg@<固定版>`で入れた安定版バイナリ（`.devcontainer/postCreate.sh`）。この拡張自身が壊れていても記録が壊れないようにするため。

## 記録者

`.claude/settings.json`の`env`に`MTQG_AUTHOR_KIND=ai`・`MTQG_AUTHOR_NAME=claude-code`を設定済み。このリポジトリでのmtqgコマンドは、明示しなければ記録者`ai`/`claude-code`になる。人間が記録するときだけ、明示して上書きする（例：`MTQG_AUTHOR_KIND=human MTQG_AUTHOR_NAME=amisonnet8 mtqg r add "..."`）。

## 何をどの種類で記録するか

mtqg本体の運用（mtqgリポジトリ`.claude/rules/mtqg-usage.md`）と同じ考え方。

| 種類 | 例 |
|---|---|
| `m add`（memo） | 実装しながらの気づき、後で見返したい観察。**不具合はここに書かない** |
| `t add`（todo） | やること。**着手前に立てる**。**終わったら間を置かず`t done`にする** |
| `q add`（question） | 判断に迷って人間に確認したいこと。**設計や実装に関わる質問は、聞き方（チャットでの一言、`AskUserQuestion`、プランモード中の確認など）を問わず必ず`q add`で記録する。** `AskUserQuestion`で聞いたときは、その場で`q add <id> <回答>`まで記録する |
| `b add`（bug） | 見つけた不具合とそのやり取り。判定基準：「本来動くべきものが動いていなかった」「仕様と実装がずれていた」はbug、単なる気づき・設計判断はmemo。その場で直したものも含めて記録する（「直したから」は判定基準に入らない） |
| `g add`（glossary） | 用語の合意 |
| `r add`（rule） | 読めばそのまま従える決まり事 |

## こまめに記録する

- **todoは着手前に立て、終わったらすぐ`t done`にする。** まとめて書く・まとめて閉じる、をしない
- **区切り（1つの変更、1つの決定、1つの確認が付いたところ）ごとに、その場で`m add`する**
- **人間に委ねる判断は、`q add`で開けておく**
- 何を記録すべきか迷ったら、**「これを書かずにセッションが終わったら、次のセッション（または人間）は`mtqg context`だけで気づけるか」**で判断する

## 作業を始めるとき

`mtqg context`を読む。ここが現状・今後の一次情報（mtqgリポジトリと違い、`PLAN.md`にも過去の経緯にも頼らない）。

## docs/design/との役割分担（決定、2026-09-28）

`docs/design/`（`vscode-extension.md`）は**現状の設計だけ**を保つ。決定に至った経緯・やり取り・修正の履歴（日付、todo/bug/q&a ID、「最初はXにしたがYと指摘されZに直した」のような narrative）はここに書かず、`.mtqg/`（`m add`・`q add`・`b add`）にだけ記録する。理由：経緯はmtqgの journal が既に唯一の記録先として持っており、design docにも同じ経緯を書くと二重管理になる（`.claude/rules/mtqg-cli.md`「解釈はコアの1か所に集める」と同じ考え方をdesign docにも広げたもの）。design docを更新するときは「今どうなっているか」だけを書き、経緯はmtqgの記録（このメモも含む）を辿れば分かる状態にする。

## その他

- `.mtqg/.local/`はコミットされない
- `.mtqg/`の中のファイルを直接編集しない（すべてmtqgのコマンド経由）
- mtqgはgitに対して読むだけ
- **手でmtqgに記録するときは、MCPツール（`mcp__mtqg__*`）を使う。** Bashから`mtqg`を直接呼ぶ場合、`--json`等のフラグは動詞の直後・本文（位置引数）より前に置く。本文の後ろに置くと、`--json`がフラグとして認識されず本文の一部としてそのまま記録されてしまう（例：`mtqg memo add "本文" --json`だと本文が`"本文 --json"`になる）。過去に7件＋3件がこの形で混入した（bug`9e399b09ef`、mtqg edit経由で修正済み）
