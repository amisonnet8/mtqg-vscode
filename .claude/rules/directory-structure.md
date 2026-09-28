# ディレクトリ構成

`*`は初期構成（2026-09-26）・拡張の雛形（todo`97779f964e`）・CLI層（todo`cd0d242c55`）・Webviewの土台（todo`b9caf0b88c`）・Rules/Glossary画面（todo`daf43fc83d`）・ToDo画面（todo`4e09f42a9f`）・QA画面（todo`8b7b600827`）・Bugs画面（todo`13570d152b`）・Memo画面（todo`01ee2706ce`）・エディタからの記録作成コマンド（todo`24f2e871d5`）・CI（todo`53cbaa3265`）・パッケージング準備（todo`2f60eb9fb1`）で作ったもの。6画面と主な操作、CI、Marketplace向けのREADME・CHANGELOGが揃った。それ以外は、後続のtodoで足す予定のもの。

```
mtqg-vscode/
*├── CLAUDE.md
*├── LICENSE
*├── README.md               （Marketplaceの説明。英語版、正式公開向けに本格作成。mtqg本体READMEと同じ構成：中央寄せヘッダー・バッジ・デモGIF）
*├── README_ja.md            （READMEの日本語版）
*├── CHANGELOG.md
*├── media/                  （拡張自身が使う画像資産。mtqgパネルのタブアイコン・Marketplaceアイコン、いずれもmtqg本体のロゴ由来）
*│   ├── tab-icon-light.svg
*│   ├── tab-icon-dark.svg
*│   └── icon.png            （Marketplaceアイコン、128×128。tab-icon-light.svgをrsvg-convertでPNG化したもの）
*├── docs/assets/            （READMEだけが参照する画像。.vscodeignoreのdocs/**で.vsixには含めず、vsceのREADMEリンク書き換え機能でGitHub上の実体を指す——公開前にpushしておく必要がある）
*│   ├── icon.png            （README見出し用、256×256）
*│   └── demo.gif            （デモはこのGIF1本のみ。静止画は役割が重複するため置かない、人間の判断）
*├── .gitattributes
*├── .gitignore
*├── trivy.yaml
*├── .mtqg/
*├── .mcp.json
*├── docs/design/vscode-extension.md（**現状の設計だけ**を保つ。経緯は`.mtqg/`に記録。連番の索引README.mdは、ファイルが1つしか無いため廃止）
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
*│       ├── panel.ts        （WebviewPanelを1つ開く／revealする。vscodeを触る唯一の場所）
*│       ├── controller.ts   （vscode非依存。Webviewからのメッセージ→mtqg呼び出し→render送信の一連。node:testで本物のmtqgを使って確認）
*│       ├── screens.ts      （renderScreenがタブIDで各画面の描画関数へ振り分ける。renderErrorもここ）
*│       ├── screens/         （画面ごとの描画。vscode非依存、node:testで確認）
*│       │   ├── format.ts   （日付の表示整形）
*│       │   ├── table.ts    （6画面共通の部品：タグを選べる編集可能要素・削除ボタン・IDコピーボタン・文字バッジ等）
*│       │   ├── rules.ts    （renderRules）
*│       │   ├── glossary.ts （renderGlossary：重複語のバッジ付け）
*│       │   ├── todos.ts    （renderTodos：Keep風カードのグリッド、Done見出しでの下段まとめ）
*│       │   ├── thread.ts   （renderThread：QA/Bugs共通の実装。1件＝見出し行＋詳細行（返信スレッド、常時の返信欄）、AI/humanバッジ。文言はThreadLabelsで注入）
*│       │   ├── questions.ts（renderQuestions：renderThreadにQA用のThreadLabelsを渡す薄い包み）
*│       │   ├── bugs.ts     （renderBugs：renderThreadにBugs用のThreadLabelsを渡す薄い包み）
*│       │   ├── composer.ts （parseComposer：Memo画面の入力欄のスラッシュコマンド解釈。純粋関数、vscode非依存）
*│       │   └── memos.ts    （renderMemos：`log --events`をタイムラインに描画。answer/replyはthread.tsのreplyRowを再利用してスレッド化、edited判定・Load earlier・Undo通知・削除の跡（v0.4.0、`deleted:true`）を持つ）
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
*│   │   ├── html.test.ts     （renderShellの確認）
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
*└── .github/workflows/
*    └── ci.yml                （check・shellcheck・trivyの3ジョブ、checkは3 OS matrix。.claude/rules/testing.md「CI」）
```

## 配置の判断基準

- **mtqgを呼ぶコードは`src/mtqg/`に集める。** 呼び出し（`child_process.execFile`、引数の組み立て、`--json`の結果の型付け）をここ以外に散らさない（`.claude/rules/mtqg-cli.md`「入口ごとに状態の組み立てを重複させない」）
- **HTMLはホスト側（Node）で組む。Webview側は組み立てない。**（q&a`0736e37fd7`）。バンドラ無し・実行時依存0の制約下で、ロジックをすべて`node:test`で試せるようにするため。拡張ホストが`src/webview/screens.ts`でタブごとのHTML文字列を組み、`src/webview/controller.ts`が`render`メッセージとしてWebviewへ送る。Webview側の`src/webview/client/main.ts`は、受け取った断片を`innerHTML`に差し込み、クリックを`selectTab`としてホストへ伝えるだけの小さな固定スクリプト（インラインのイベントハンドラは使わずイベント委譲＋`data-tab`属性で、CSPの`script-src`を緩めない）
- **画面ごとの中身は`src/webview/screens/`に1ファイルずつ足し、`screens.ts`の`renderScreen`から振り分ける。** タブという横串の構造（`shared/tabs.ts`）と、画面ごとのレイアウトを分けている。複数の画面にまたがる部品（編集可能セル・削除ボタンなど）は`screens/table.ts`のように共通化する
- **編集・削除は種別非依存のメッセージ（`editRecord`・`deleteRecord`）にする。** mtqgの`edit`/`delete`自体が記録の種類を問わないのに合わせ、今後の画面（ToDo/QA/Bugs）もこの2つをそのまま使う。追加はコマンドの引数が種類ごとに違う（`ruleAdd(text)`・`glossaryAdd(word, text)`等）ため`addRule`・`addGlossary`のように種類ごとのメッセージにする
- **状態変更（done/reopen）も種別非依存のメッセージ（`setStatus`）にする。** `controller.ts`がタブで`todoDone`/`todoReopen`（今後QA/Bugsなら`qaDone`等）に振り分ける。「全件を見るか」の切り替え（`setShowAll`）はmtqgの記録ではなく表示設定なので、`controller.ts`が`Set<TabId>`で持つ（todo`4e09f42a9f`）。パネルを開き直すと既定（未完了のみ）に戻るのは許容している
- **`todoList`のようなstateful listは常に`{ all: true }`で取得し、絞り込みは描画側（`screens/todos.ts`）で行う。** 「Show done」トグルの切り替えだけで再度mtqgを呼ばずに済み、かつトグルの脇に出す件数（例:「Show done (2)」）が常に真の総数になる
- **「どの行が展開されているか」も表示状態としてcontroller.tsが持つ（`Map<TabId, Set<string>>`、todo`8b7b600827`）。** `showAll`と同じ理由（mtqgの記録ではない）。`qa list`/`bug list`は各質問・バグに`replies`を既に含めて返す（実機で確認済み）ため、展開時に`show`を呼び直す必要はなく、`toggleExpand`は表示状態を更新して再描画するだけ
- **既存レコードのidに新しい子レコードをぶら下げて追加するUI（QAの回答、Bugsの返信）は、`editRecord`と区別できるマーカーを持たせる。** `renderThread`の返信入力欄は`.add-row`（idを持たない扱い）に`data-parent-id`を持たせ、`main.ts`側で「id有り→編集」より先に「`.add-row`かつ`data-parent-id`有り→新規追加（`addAnswer`/`addBugReply`をタブで出し分け）」を判定する
- **QAとBugsのように構造が完全に同じ画面は、実装を1つに切り出し、文言だけ注入する。** `screens/thread.ts`の`renderThread(records, labels, view)`がその形（`ThreadLabels`）。**文言はnaming.mdの用語対応表（question/answer、bug/reply）どおりに書き分ける。** QA実装時に一度、回答欄にBugs用の語「Reply」を誤って使っていた（`b add 48b5d29d54a3`）。同じ構造を再利用するときほど、隣の画面の言葉が紛れ込みやすいので注意する
- **`setStatus`のようなタブ横断の種別非依存メッセージは、タブが増えるほどネストした三項演算子ではなく`Partial<Record<TabId, {...}>>`のようなルックアップに寄せる。** `controller.ts`の`statusActions`（todo`13570d152b`）。**1つのタブに複数の記録の種類が混在する画面（Memo、todo`01ee2706ce`）では、タブだけでは振り分けられない。** `setStatus`に任意の`kind`を足し、`kind`があればそちらを優先してルックアップする（`statusActionsByKind`）。タブ由来の`statusActions`はこのルックアップの別名として組み直し、二重管理にしない
- **読み取り側の再フェッチも、書き込み側（`runWrite`）と同じ「mtqgから毎回取り直す、DOMを推測で直さない」方針に揃える。** Memo画面（todo`01ee2706ce`）はページングに`log --before`ではなく`log --limit`を伸ばす方式を選んだ——`--before`でページを継ぎ足すと、既に読み込んだページの記録が後から編集・削除されても、そのページを再取得しない限り古いまま残ってしまうため（`docs/design/vscode-extension.md`「Memo画面の実装」）。表示件数（`memoLimit`）は`showAll`/`expanded`と同じくcontroller.tsが持つ表示状態で、mtqgの記録ではない
- **`log --json --events`の`op:"edit"`の有無で「編集済み」を判定する。** `updated`はdone/reopen等でも進むため、`created !== updated`だけでは編集と状態変更を区別できない
- **削除された記録を返すのは`log --json --events`だけ**（mtqg本体v0.4.0、`deleted:true`＋自分自身の`delete`イベント）。`show`・`--events`無しの`log`・各`list`は変わらず削除されたら見えなくなる。親（質問・バグ）が削除されて隠れた回答・返信も`deleted:true`が付くが、自分自身の`delete`イベントは持たない——`memos.ts`はこの2つを区別して、削除されたレコードは跡（本文を隠した一行）、親ごと隠れただけのレコードは親の跡に件数だけ足す形にしている
- **`vscode`を触るのは`src/webview/panel.ts`だけ。** `controller.ts`・`screens.ts`・`shared/`はvscode非依存にし、本物のmtqgバイナリを使う`node:test`で試す（`.claude/rules/testing.md`）。**Webview以外の新しいvscodeコマンドを足すときは、位置計算・入力解釈など純粋なロジックをvscode非依存のファイルに切り出し、vscodeを触る部分（`vscode.window`・`vscode.commands.registerCommand`等）だけをコマンド登録側に残す**（`screens/`とpanel.tsの分離と同じ考え方。かつて`src/commands/`にこの形で置いていたが、唯一の中身だった`mtqg.createAt`を廃止したため今は無い）
- **Webview内で実際に動くスクリプト（`src/webview/client/`）は別tsconfig。** ホスト側はCommonJS（`vscode`の型）、Webview側はDOM型・ブラウザ向けESM出力で、1つのtsconfigでは両立しない（バンドラを使わない方針、`.claude/rules/dependencies.md`）。ルートの`tsconfig.json`は`src/webview/client`を`exclude`する
- **`src/extension.ts`は薄く保つ。** コマンドの登録とWebviewパネルの起動だけを行い、ロジックは`src/mtqg/`・`src/webview/`に置く
- **`docs/design/`**：**現状の設計だけ**を保つ記録（日本語）。決定に至った経緯・修正の履歴はここに書かず`.mtqg/`に記録する（`.claude/rules/mtqg-usage.md`「docs/design/との役割分担」）。仕様と食い違う場合はコード（と、あれば`docs/reference/`相当の文書）が正、という考え方はmtqgと同じ
- **`.mtqg/`の中のファイルを直接編集しない。** すべてmtqgのコマンド経由（`.claude/rules/mtqg-usage.md`）
