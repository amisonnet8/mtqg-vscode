# 命名規則

このリポジトリはmtqg（`github.com/amisonnet8/mtqg`）を使う側であり、独自の用語を作らない。mtqgリポジトリの`.claude/rules/naming.md`にある用語対応表（記録=record、種類=kind、記録者=author、質問/回答=question/answer、バグ/返信=bug/reply、決まり事=rule、未完了・未クローズ/完了=open/done、など）を、拡張のコード・UI・コメントでもそのまま使う。同じものに別の英語を当てない。

- **拡張自身の名前**：TypeScript側の変数・関数名は通常のTypeScriptの慣習（camelCase、型はPascalCase）に従う
- **`mtqg`は常に小文字**（コマンド名・パッケージ名とそろえる。mtqgリポジトリの`naming.md`と同じ理由）
- **UIの文言は英語**（`.claude/rules/ui.md`）。ラベルは、上の用語対応表の英語をそのまま使う（例：QA画面の表の列見出しは"Question"、状態は"open"/"done"）。独自の言い換え（"Tasks"や"Notes"など）をしない。**ただし、タブバー自体の6つのラベルは例外**——人間の指示（2026-09-26、q&a`70787501f3f3`・`a1daf7a25153`）で`Memo・Todo・QA・Bug・Rule・Glossary`（すべて単数形／集合名詞、質問は省略形"QA"）にしている。画面内部の見出し・ボタン等は引き続き用語対応表の語をそのまま使う
- **対応表の中の似た組（question/answer と bug/reply）を取り違えない。** QA画面とBugs画面は構造が同じで実装も共通化している（`src/webview/screens/thread.ts`）が、UIの文言はそれぞれの対応する語を使う——QAの回答欄に"Reply"、Bugsの返信欄に"Answer"のような取り違えをしない。実装を1つの部品に共通化するときほど、片方の画面の言葉がもう片方に紛れ込みやすい（不具合`48b5d29d54a3`、todo`13570d152b`で発見・修正：QA画面の回答欄に"Reply"を使ってしまっていた）
- **`package.json`のコマンド名：`category`はコマンドパレットにしか表示されない。** エディタ右クリックメニュー（`editor/context`）・エディタタイトルのツールバー（`editor/title`）等は`title`しか表示せず、`category`を前置しない。`category: "mtqg"`＋`title: "Open"`のような分割にすると、パレット以外の場所（右クリックメニュー、ツールバーのツールチップ）に"mtqg"が付かず、どの拡張のコマンドか分かりにくくなる。**`category`は使わず、`title`自体に`"mtqg: <名前>"`と書く**（`mtqg.createAt`＝"mtqg: New Record Here"、`mtqg.open`＝"mtqg: Open"）——コマンドパレットでもそれ以外の場所でも同じ文言がそのまま表示される。2回とも人間の指摘で発覚（`mtqg.createAt`：todo`24f2e871d5`、`mtqg.open`のeditor/titleアイコン：bug`68a82b6998`）
