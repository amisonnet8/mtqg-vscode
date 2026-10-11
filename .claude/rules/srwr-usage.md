# srwrの使い方（厳格モード）

このリポジトリでは、AIのファイル編集を**srwr**（`github.com/amisonnet8/srwr`）の道具で行う。すべての編集に理由（`why`）が付き、操作が**テープ**（`.srwr/tapes/`）に残り、人間がコマ送りで再生できる。2026-10-11から本格運用（`srwr init`の既定＝**厳格モード**）。

## 厳格モードとは

`.claude/settings.json`で、Claude Codeの`Edit`・`Write`・`MultiEdit`・`NotebookEdit`を禁止している。**ファイルを変える入口は、srwrの道具だけ**。

| 道具 | 使い方 |
|---|---|
| `mcp__srwr__session` | **作業のまとまりの最初に呼ぶ**。題（`title`）と理由（`why`）つきで新しいテープを始める。ファイルには触れない（下の「セッション」） |
| `mcp__srwr__look` | ファイルの範囲を見る。`search`で探す（ディレクトリも可）。`looks`で複数ファイルを1回で見る。範囲トークン（`sel_…`）が返る |
| `mcp__srwr__edit` | 範囲を書き換える。`selection`（`look`のトークン）、または`file`＋`expect`、行の一部は`old`＋`new`。同じ変更を複数箇所に入れるときは`edits`（`why`は1つ、全部入るか全部入らないか） |
| `mcp__srwr__new` | まだ無いファイルを、内容つきで作る |

- **`why`は必須**（空白だけも不可）。「何をするか」でなく**「なぜそうするか」**を1〜2文で書く。人間が再生で読む
- 読むだけなら、組み込みの`Read`・`Grep`・`Bash`の`cat`なども使える（hookが記録する）。**ただし、このあと直すつもりなら最初から`look`を使う**（トークンが得られ、読んだ記録と変更が1つの流れで残る）
- ツールの入力の詳細は、srwrの`docs/reference/mcp.md`（https://github.com/amisonnet8/srwr/blob/main/docs/reference/mcp.md）

## セッション（テープの区切り）を細かく使う

**1つの作業のまとまり＝1本のテープ**にする。人間は`srwr tapes`の一覧（題が出る）から「あの作業」を選んで再生するので、区切りと題が、再生の入口になる。区切らないと、30分空くまで別の作業が1本に混ざる。

### いつ`session`を呼ぶか

- **mtqgのtodoに着手するとき**（`mtqg todo add`のあと、最初の`look`の前）。1つのtodoが1本
- **bugの調査・修正に入るとき**、**人間から新しい依頼を受けたとき**
- **作業の種類が変わるとき**（実装→文書、拡張→CI、など。1つのtodoの中でも、種類が変われば区切る）
- **レビューの指摘を直すとき**（元の作業とは別のテープにする。直しの理由だけを読めるように）
- 呼ばない：1つの編集ごと、確認の`look`ごと、コミットごと。**同じ作業の途中では呼び直さない**

### 題（`title`）と理由（`why`）

- `title`：1行・80文字以内。**「何の作業か」が一覧で分かる形**にする。mtqgのIDがあれば入れる。例：`todo 0822a2c167: 再起動後にmtqgパネルを復元する`、`bug 2d4ad01d30: qsoku testがSIGTRAPで落ちる`、`docs: srwrの使い方を rules に追加`
- `why`：なぜこの作業を始めるか、を1〜2文。todoの本文をそのまま写すのでなく、**今回やる範囲**を書く
- 題は「後から読む人」のために書く。「修正」「作業」「続き」のような、中身のない題にしない
- 空白だけ・複数行・80文字超は`invalid_input`になる

### 終わり方

- **作業のまとまりが終わったら、閉じる**：次の作業に移る前に、次の`session`を呼ぶ（前のテープを閉じて圧縮し、新しいテープを始める）。次の作業が決まっていなければ、`srwr tapes new`（Bash）で閉じる
- **コミットの前に、テープを閉じる**：先に`srwr tapes check`を動かし、そのあと`srwr tapes new`（Bash）で閉じて圧縮してから`git add`・`git commit`する。**閉じる前のテープ（`*.tape.jsonl`）は`.gitignore`でgitの対象外**なので、閉じ忘れると、そのコミットにテープが入らない（`srwr trace`でその行が引けない）。閉じたあとの書き込みは新しいテープを始める。コミットのあとは、同じ作業が続くなら`session`で題つきの新しいテープを始める
- `srwr tapes check`は、テープに無いのに作業場で変わったファイルを出す。出たものは、生成物なら`.srwrignore`に足すか、そのままでよいと判断し、手で書いたものなら理由を人間に伝える
- **コミットは、テープと同じ区切りにする。** 1本のテープ＝1つか数個のコミット。コミットメッセージにテープのID（`srwr tapes`で分かる）を書くと、`git show <commit> | srwr trace`で「どの行がどの操作・理由か」を引ける
- 何も記録しなかったテープ（`session`だけ呼んだ）は、次の`session`で消える。気にせず呼んでよい
- 30分空くと、`session`を呼ばなくても自動で新しいテープになる（題は付かない）。**題つきで始めるのが原則**

## 守ること

- **`Edit`・`Write`を使おうとしない。** 禁止されていて、拒否される。拒否されたら`look`＋`edit`／`new`に切り替える
- **Bashでファイルを書き換えない**（`sed -i`・リダイレクト・`tee`・`cat > file`など）。止められないが、理由のない`external`としてテープに残り、再生が読みにくくなる。ジェネレーターや整形ツール（`tsc`・`npm`・`qsoku fmt`など）が書くものは、そのままでよい
- **`.mtqg/`は`mtqg`のコマンド経由だけ**（`.claude/rules/mtqg-usage.md`）。`.srwrignore`で記録から外してあるので、`look`・`edit`は`ignored_file`で断られる
- **`.claude/settings.json`は人間が管理する。** 変更案は差分で示し、`edit`で書き換えない（`CLAUDE.md`「権限・自動化について」）。`.mcp.json`・`.devcontainer/`も、人間の依頼があったときだけ変える
- 人間が事情を聞くときは、テープのIDで答えられる（`srwr tapes`で一覧、`srwr view`で再生）

## このリポジトリでの取り決め

- **テープは共有する**（閉じて圧縮したテープ`.srwr/tapes/*.tape.jsonl.gz`をgitに入れる。`.gitignore`で`.srwr/`の中は`tapes/`だけ戻し、**書き込み中の生のテープ`*.tape.jsonl`は対象外**にする。生のまま入れると、閉じたとき「生の削除＋`.gz`の追加」が差分に出る。決定、2026-10-11・10-12）。clone先で`srwr view`・`srwr trace`が使える（圧縮したテープ`.tape.jsonl.gz`も同じ）。**鍵`.srwr/key`・ロック・`init-backup/`は入れない**。テープはファイルの全文を含むので、秘密のファイルは記録しない（`.srwrignore`と既定の対象）。今のセッションのテープは閉じるまで入らない（コミットの前に`srwr tapes new`で閉じる）
- **記録しないもの**（`.srwrignore`）：`.mtqg/`・`node_modules/`・`out/`・`.vscode-test/`。秘密の既定の対象（`.env`・`*.pem`・`*.key`など）はsrwrが元から外す
- **srwrは`.devcontainer/postCreate.sh`で`@latest`**（qsoku・mtqgと同じ。決定、2026-10-11）。0.xの間は道具の名前や入力が変わりうるので、**コンテナを作り直したら`srwr --version`を見て、版が変わっていたら`srwr init`を1回動かす**（許可する道具の名前が`.claude/settings.json`に追従する。何も変わらなければ`Already set up. Nothing was rewritten.`と出る）
- 厳格⇄緩いの切り替えは`srwr init`／`srwr init --lenient`。**緩いモードにするのは人間の判断**（`Write`が記録されず`external`になる）。AIが勝手に切り替えない
- hookの`build.sh`は、srwrの`edit`・`new`の入力（`file`・`edits[].file`）を見て、`.ts`・`package.json`・`tsconfig.json`のときだけ`qsoku build`を動かす（組み込みの`Edit`・`Write`は禁止なので、そちらでは動かない）

## 落とし穴

- **`srwr init`は、Bashサンドボックスの中では`.mcp.json`・`.claude/settings.json`を書き換えられない**（一時ファイルから`rename`するが、サンドボックスが`device or resource busy`にする。`.srwr/`の鍵だけが先にできる）。人間がサンドボックスの外のターミナルで動かす。AIが準備するときは、一時的な作業場にコピーして`srwr init`を動かし、できた内容を`Write`で書き戻す（2026-10-11、導入時に踏んだ）
- **最初の1回は、Claude Codeを開き直す。** `.mcp.json`のsrwrサーバーと許可は、起動時に読まれる。開き直すまで`mcp__srwr__*`は現れない
- `srwr`が`PATH`に無いと、`.mcp.json`もhookも動かない（hookは失敗しても作業は止まらず、記録だけが抜ける）。`srwr --version`で確かめる
- **`session`を呼ぶと、作業場全体のテープが切り替わる**（`srwr tapes new`と同じ）。ほかのセッション（人間が別のClaude Codeを動かしているなど）にも効く。範囲トークンは、閉じたテープのものは使えなくなるので、`session`のあとは`look`し直す
