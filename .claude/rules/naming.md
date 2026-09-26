# 命名規則

このリポジトリはmtqg（`github.com/amisonnet8/mtqg`）を使う側であり、独自の用語を作らない。mtqgリポジトリの`.claude/rules/naming.md`にある用語対応表（記録=record、種類=kind、記録者=author、質問/回答=question/answer、バグ/返信=bug/reply、決まり事=rule、未完了・未クローズ/完了=open/done、など）を、拡張のコード・UI・コメントでもそのまま使う。同じものに別の英語を当てない。

- **拡張自身の名前**：TypeScript側の変数・関数名は通常のTypeScriptの慣習（camelCase、型はPascalCase）に従う
- **`mtqg`は常に小文字**（コマンド名・パッケージ名とそろえる。mtqgリポジトリの`naming.md`と同じ理由）
- **UIの文言は英語**（`.claude/rules/ui.md`）。ラベルは、上の用語対応表の英語をそのまま使う（例：質問一覧の見出しは"Questions"、状態は"open"/"done"）。独自の言い換え（"Tasks"や"Notes"など）をしない
