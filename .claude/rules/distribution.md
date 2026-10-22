# 配布方法

- **配布先は VS Code Marketplace**（`.vsix`）。同じ`.vsix`を GitHub Release にも添付する（`.github/workflows/release.yml`）。**Marketplace への公開（`vsce publish`）は人間が行う。** `.claude/settings.json`で拒否（deny）されている。トークンを用意していないので、workflow からも公開しない
- `.vsix`は`qsoku package`で作る（`release.yml`も同じ名前を呼ぶ）。サンドボックスの中では失敗するので、手元で作るときは人間のターミナルで作る（`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」）
- 公開の前に`npx vsce ls`で、パッケージに入るファイルを目で確かめる（`.vscodeignore`に無いものは、そのまま公開物に入る）

## このPJのリリースの手順

タグをpushすると、`.github/workflows/release.yml`が、版の確認・`ci.yml`の検査・`.vsix`づくり・GitHub Release の公開まで行う（2026-10-22、全PJでリリースの仕組みを統一した人間の決定）。人間がするのは、タグの push と、Marketplace への公開だけ。

| # | 誰が | すること |
|---|---|---|
| 1 | AI | `package.json`の`version`と、`package-lock.json`の版（先頭の`version`と`packages[""].version`の2か所）を次の版にする |
| 2 | AI | `CHANGELOG.md`に`## [X.Y.Z] - YYYY-MM-DD`の項目を足す（Keep a Changelogの形。先頭に「Requires `mtqg` X.Y.Z or later」の行、`### Added`・`### Changed`・`### Fixed`で分ける。利用者に見える違いが無い変更は、そう書く）。これが Release の本文になる |
| 3 | AI | `qsoku check`を通し、`npx vsce ls`で`.vsix`に入るファイルを確かめ、コミットする |
| 4 | 人間 | `main`をpushし、**CIの全ジョブ（macOSを含む）が通るのを待つ**。macOSでだけ止まる・落ちることがある（`.claude/rules/testing.md`） |
| 5 | 人間 | CIが通ったコミットに、軽量タグを打ってpushする：`git tag vX.Y.Z <コミット>`・`git push origin vX.Y.Z`（v1.0.0からずっと軽量タグ） |
| 6 | workflow | `release.yml`：タグと`package.json`の版を比べ、違えば止まる → `ci.yml`の検査 → `qsoku package` → 下書きの Release に`.vsix`を添付（本文は`CHANGELOG.md`のその版の節。見出しの下から、折り返しの行はつないで1行にする。節が無ければ止まる）→ 公開 |
| 7 | 人間 | 公開された Release から`.vsix`を取り、Marketplace の Web から上げる |

- **AIは、タグも Release も作らない。** Release の本文は`CHANGELOG.md`から workflow が作るので、貼り付ける文を用意して渡すことも要らない
- 版を上げるかの目安：**`.vsix`に入るコード（`src/`・`package.json`・`media/`・`README.md`など。`npx vsce ls`に出るもの）が前のタグから変わったら**、利用者に見える違いが無くても、次の変更の予定が無ければ早めに出す。公開中の版とコードが長く食い違わないようにするため（人間の判断、q&a`1553ba0462`）。ルール・CI・テスト・devcontainerだけの変更は、`.vsix`に入らないので版を上げない

## リリースの流れ

ビルド済みのバイナリなどを GitHub Releases で配るときは、次の流れにする。どのプロジェクトも同じ。

1. **人間が**タグ（`v0.1.0`の形）を打って push する。人間がするのはこれだけ
2. タグで動く workflow（`.github/workflows/release.yml`）が、検査を通してから配布物を作り、Release に添付して**公開する**（本文は`CHANGELOG.md`のその版の節）

- **Claude Codeは、タグも Release も作らない。** `gh release create`は`.claude/settings.json`で拒否（deny）されている。Release を作るのは workflow の中だけ
- `.vsix`はいったん**下書き**に添付し、添付し終えてから最後の手順（`gh release edit --draft=false`）で公開する。途中で落ちると下書きだけが残り、公開された Release に`.vsix`が欠けることはない。同じタグでもう一度動かすと、`release.yml`がその下書きを消してから作り直す。落ちたときは、原因を直したコミットに新しいタグを打つか、同じコミットのままなら workflow を再実行する
- **公開済みの Release があるタグでは、何も変えずに失敗する**（最初の手順）。出し直すときは、新しいタグを打つ
- ビルド済みのバイナリは、リポジトリにコミットしない（`.claude/rules/directory-structure.md`「配布物」）

## VS Code の拡張を配るとき

VS Code の拡張（`.vsix`）を持つプロジェクトも、同じ流れにする。

- **拡張の版（`package.json`の`version`）は、タグから`v`を除いたものと同じにする**。Go のコマンドも配るプロジェクトでは、コマンドと拡張を同じ版で出す（Release に版の違う`.vsix`が並ぶと、どれが対か分からない）。拡張が変わらない版でも上げる。タグを打つ前に、`package.json`と`package-lock.json`（2か所）を次の版にしてコミットする
- `release.yml`の**最初のジョブ**で、タグと`package.json`の版を比べ、違えば何も作らずに止める（長い検査の前に。`jq -r .version`。見本は srwr）
- **拡張だけのプロジェクト**（goreleaser を使わない）：`release.yml`で、公開済みならば失敗する最初の手順と`ci.yml`の検査のあと、`.vsix`を作り、`gh release create --draft`で下書きを作って添付し（本文は`CHANGELOG.md`のその版の節）、最後に公開する
- **Marketplace への公開は、人間が手で行う**（Marketplace の Web から`.vsix`を上げる。トークンを用意していないので、workflow からは公開しない）。GitHub Release に添付された`.vsix`を使う
