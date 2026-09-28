# mtqgとのつながり方

このリポジトリの拡張は、mtqg本体（Go製、別リポジトリ）とは**プロセス起動＋`--json`**だけでつながる。データの解釈はmtqgのCLIに任せ、この拡張の中で複製しない（mtqg設計§11.4「解釈はコアの1か所に集める」の延長）。

## 呼び方

- `child_process.execFile`（またはPromise化したもの）で、**引数を配列で渡す**。シェルを経由しない（`exec`は使わない。本文にシェルのメタ文字が含まれても壊れない・注入されないため）
- **常に`--json`を付ける。** 標準出力はJSONオブジェクト1つ（最初のフィールドが`command`）。標準エラーには、エラー・警告が1行のJSONで出る（`{"error":{"kind":...,"message":...}}`・`{"warning":{...}}`）。`kind`で機械的に見分け、`message`は人間に見せる文言としてそのまま使ってよい（mtqgの`.claude/rules/cli-output.md`）
- **知らないフィールドは無視する。** `--json`の形は外部との約束で、mtqgは今後フィールドを足すことはあっても、既存のフィールドを変えない
- IDはmtqgに渡すときは常に完全な32桁を使う（表示に短縮IDを使ってよいが、コマンドへ渡すのは32桁。曖昧な前方一致の候補選びをこの拡張では行わない）
- `mtqg`本体の実行ファイル名はOSで違う（Windowsは`mtqg.exe`）。Node.jsの`child_process`は`PATH`解決を行うので、実行ファイル名は`"mtqg"`のまま渡してよい（`.cmd`/`.exe`の解決はNode側に任せる）
- **`--`（オプション終端）は「まだオプションを見ている位置」の直前にしか効かない。** それより後ろの語（IDや`word`など、コマンドが位置引数として先に消費するもの）の後に置いても、mtqgはそこをもう文字列としてしか読まないため、`--`自体が本文に混ざる（`mtqg edit <id> -- foo`の本文が`"-- foo"`になる、`mtqg glossary add <word> -- <definition>`の定義文が`"-- ..."`になる、`mtqg qa add <question-id> -- <answer>`・`mtqg bug add <bug-id> -- <text>`も同様）。**正しい位置は、ID・wordなど位置引数の直前**（`mtqg glossary add -- <word> <definition>`・`mtqg qa add -- <question-id> <answer>`のように）。`add`系のうちIDや`word`を取らないもの（`memo add`・`todo add`・`rule add`・`qa add`（質問）・`bug add`（新規）・`search`）は`--`をコマンド名の直後に置けばよい
- **見つけた不具合（`2f3d4fe998`＝`edit`、`8c428a9ed7`＝`glossaryAdd`、いずれもtodo`daf43fc83d`）は、同じ思い込み（「`--`は常にテキストの直前」）から来ていた。** `client.ts`に新しい呼び出しを足すたびに、`--`の位置を含めて実機で確かめること。テストも「含まれているか」（`assert.match`の部分一致）ではなく「一致しているか」（`assert.equal`）で本文を検証する——部分一致では`"-- foo"`が`"foo"`を含むため、このバグをすり抜ける

## 書き込みも読み込みもCLI経由

- `journal.jsonl`やその他`.mtqg/`の中のファイルを、この拡張が直接読み書きしない。作成・状態変更・編集はすべて対応するmtqgコマンドを`--json`付きで呼ぶ
- **足りない`--json`の出力・操作は、この拡張の中で回避せず、mtqg本体に仕様追加を依頼する。** ここで解釈やフォールバックを作ると、コアの外にもう1つの解釈が生まれる（mtqg設計§11.4「入口ごとに状態の組み立てを重複させない」と同じ考え方）

## 版

- **この拡張が前提にする最低版は`src/mtqg/availability.ts`の`MIN_SUPPORTED_MTQG_VERSION`。** mtqg側の`--json`の形が変わったら（フィールド追加のみのはずだが）、動作確認してからここと`.github/workflows/ci.yml`のインストール版を揃えて上げる（決定、2026-09-29、todo`7a072cc72a`）
- **`.devcontainer/postCreate.sh`が入れるmtqgは`@latest`（固定版ではない）。** 開発用コンテナは常に最新のmtqgを試せる方が有用なため、qsokuと同じ扱いにしている。上の最低版とは別物——`postCreate.sh`のmtqgが先に上がっても、この拡張が実際に前提とする版（コード上の`MIN_SUPPORTED_MTQG_VERSION`・CIのインストール版）はそのままでよい
