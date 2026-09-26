# ディレクトリ構成

`*`は初期構成（2026-09-26）・拡張の雛形（todo`97779f964e`）・CLI層（todo`cd0d242c55`）・Webviewの土台（todo`b9caf0b88c`）・Rules/Glossary画面（todo`daf43fc83d`）・ToDo画面（todo`4e09f42a9f`）・QA画面（todo`8b7b600827`）で作ったもの。それ以外は、後続のtodoで足す予定のもの。

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
*│       ├── screens.ts      （renderScreenがタブIDで各画面の描画関数へ振り分ける。renderErrorもここ）
*│       ├── screens/         （画面ごとの描画。vscode非依存、node:testで確認）
*│       │   ├── format.ts   （日付の表示整形）
*│       │   ├── table.ts    （Rules/Glossary/ToDo/QA共通の部品：タグを選べる編集可能要素・削除ボタン・文字バッジ等）
*│       │   ├── rules.ts    （renderRules）
*│       │   ├── glossary.ts （renderGlossary：重複語のバッジ付け）
*│       │   ├── todos.ts    （renderTodos：Keep風カードのグリッド、Done見出しでの下段まとめ）
*│       │   └── questions.ts（renderQuestions：質問1件＝見出し行＋詳細行（回答スレッド、常時の返信欄）、AI/humanバッジ）
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
*│   │       └── screens/
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
- **画面ごとの中身は`src/webview/screens/`に1ファイルずつ足し、`screens.ts`の`renderScreen`から振り分ける。** タブという横串の構造（`shared/tabs.ts`）と、画面ごとのレイアウトを分けている。複数の画面にまたがる部品（編集可能セル・削除ボタンなど）は`screens/table.ts`のように共通化する
- **編集・削除は種別非依存のメッセージ（`editRecord`・`deleteRecord`）にする。** mtqgの`edit`/`delete`自体が記録の種類を問わないのに合わせ、今後の画面（ToDo/QA/Bugs）もこの2つをそのまま使う。追加はコマンドの引数が種類ごとに違う（`ruleAdd(text)`・`glossaryAdd(word, text)`等）ため`addRule`・`addGlossary`のように種類ごとのメッセージにする
- **状態変更（done/reopen）も種別非依存のメッセージ（`setStatus`）にする。** `controller.ts`がタブで`todoDone`/`todoReopen`（今後QA/Bugsなら`qaDone`等）に振り分ける。「全件を見るか」の切り替え（`setShowAll`）はmtqgの記録ではなく表示設定なので、`controller.ts`が`Set<TabId>`で持つ（todo`4e09f42a9f`）。パネルを開き直すと既定（未完了のみ）に戻るのは許容している
- **`todoList`のようなstateful listは常に`{ all: true }`で取得し、絞り込みは描画側（`screens/todos.ts`）で行う。** 「Show done」トグルの切り替えだけで再度mtqgを呼ばずに済み、かつトグルの脇に出す件数（例:「Show done (2)」）が常に真の総数になる
- **「どの行が展開されているか」も表示状態としてcontroller.tsが持つ（`Map<TabId, Set<string>>`、todo`8b7b600827`）。** `showAll`と同じ理由（mtqgの記録ではない）。`qa list`は各質問に`replies`を既に含めて返す（実機で確認済み）ため、展開時に`show`を呼び直す必要はなく、`toggleExpand`は表示状態を更新して再描画するだけ
- **質問への「回答を追加する」のように、既存レコードのidに新しい子レコードをぶら下げて追加するUIは、`editRecord`と区別できるマーカーを持たせる。** `renderQuestions`の返信入力欄は`.add-row`（idを持たない扱い）に`data-question-id`を持たせ、`main.ts`側で「id有り→編集」より先に「`.add-row`かつ`data-question-id`有り→新規追加」を判定する（`addAnswer`）
- **`vscode`を触るのは`src/webview/panel.ts`だけ。** `controller.ts`・`screens.ts`・`shared/`はvscode非依存にし、本物のmtqgバイナリを使う`node:test`で試す（`.claude/rules/testing.md`）
- **Webview内で実際に動くスクリプト（`src/webview/client/`）は別tsconfig。** ホスト側はCommonJS（`vscode`の型）、Webview側はDOM型・ブラウザ向けESM出力で、1つのtsconfigでは両立しない（バンドラを使わない方針、`.claude/rules/dependencies.md`）。ルートの`tsconfig.json`は`src/webview/client`を`exclude`する
- **`src/extension.ts`は薄く保つ。** コマンドの登録とWebviewパネルの起動だけを行い、ロジックは`src/mtqg/`・`src/webview/`に置く
- **`docs/design/`**：設計判断と理由の記録（日本語）。mtqg設計§11.4からの引き継ぎと、このリポジトリ側で新たに決めたことを書く。仕様と食い違う場合はコード（と、あれば`docs/reference/`相当の文書）が正、という考え方はmtqgと同じ
- **`.mtqg/`の中のファイルを直接編集しない。** すべてmtqgのコマンド経由（`.claude/rules/mtqg-usage.md`）
