# 配布方法

- **配布先は VS Code Marketplace**（`.vsix`）。**公開（`vsce publish`）は人間が行う。** `.claude/settings.json`で拒否（deny）されている
- `.vsix`は`qsoku package`で作る。サンドボックスの中では失敗するので、人間のターミナルで作る（`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」）
- 公開の前に`npx vsce ls`で、パッケージに入るファイルを目で確かめる（`.vscodeignore`に無いものは、そのまま公開物に入る）

<!-- TODO: そのほかの配布方法（版の上げ方、CHANGELOGの書き方など）を、決まったら書く -->

## リリースの流れ

ビルド済みのバイナリなどを GitHub Releases で配るときは、次の流れにする。

1. **人間が**タグ（`v0.1.0`の形）を打って push する
2. タグで動く workflow（`.github/workflows/release.yml`）が、テストを通してから配布物を作り、**下書きの Release**（`--draft`）に添付する
3. **人間が**下書きの中身を見て、公開する

- **Claude Codeは、タグも Release も作らない。** `gh release create`は`.claude/settings.json`で拒否（deny）されている。Release を作るのは workflow の中だけ
- `release.yml`と、配布物の作り方（goreleaser、または`qsokufile`の自前の項目）は、プロジェクトが選ぶ。このリポジトリには、今は無い（Marketplace で配るため）
- ビルド済みのバイナリは、リポジトリにコミットしない（`.claude/rules/directory-structure.md`「配布物」）
