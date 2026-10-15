# 配布方法

- **配布先は VS Code Marketplace**（`.vsix`）。**公開（`vsce publish`）は人間が行う。** `.claude/settings.json`で拒否（deny）されている
- `.vsix`は`qsoku package`で作る。サンドボックスの中では失敗するので、人間のターミナルで作る（`.claude/rules/testing.md`「Bashサンドボックスの落とし穴」）
- 公開の前に`npx vsce ls`で、パッケージに入るファイルを目で確かめる（`.vscodeignore`に無いものは、そのまま公開物に入る）

## このPJのリリースの手順

タグをpushしても、**何も自動では動かない**（`ci.yml`は`main`へのpushとプルリクエストでだけ動き、`release.yml`は無い）。`.vsix`づくり・Marketplaceへの公開・GitHub Releasesは、すべて人間が手で行う。

| # | 誰が | すること |
|---|---|---|
| 1 | AI | `package.json`の`version`を上げる（`package-lock.json`の版は`0.0.1`のまま触らない。これまでも合わせていない） |
| 2 | AI | `CHANGELOG.md`に`## [X.Y.Z] - YYYY-MM-DD`の項目を足す（Keep a Changelogの形。先頭に「Requires `mtqg` X.Y.Z or later」の行、`### Added`・`### Changed`・`### Fixed`で分ける。利用者に見える違いが無い変更は、そう書く） |
| 3 | AI | `qsoku check`を通し、`npx vsce ls`で`.vsix`に入るファイルを確かめ、コミットする |
| 4 | 人間 | `main`をpushし、**CIの全ジョブ（macOSを含む）が通るのを待つ**。macOSでだけ止まる・落ちることがある（`.claude/rules/testing.md`） |
| 5 | 人間 | CIが通ったコミットに、軽量タグを打ってpushする：`git tag vX.Y.Z <コミット>`・`git push origin vX.Y.Z`（v1.0.0からずっと軽量タグ） |
| 6 | 人間 | サンドボックスの外のターミナルで`qsoku package`を動かし、できた`.vsix`をMarketplaceに公開する |
| 7 | 人間 | **GitHub Releasesを手で作る**（`https://github.com/amisonnet8/mtqg-vscode/releases/new`）。タグとタイトルは`vX.Y.Z`、本文はCHANGELOGのその版の項目（見出しの下から。箇条書きの行の折り返しはつないで1行にする）、**添付ファイルは付けない** |

- **AIは、7の本文を貼り付けられる形で用意して渡す。** Releasesは人間が作るもので、AIは`gh release create`を使えない。下の共通の「リリースの流れ」の「Releaseを作るのはworkflowの中だけ」は、workflowで配布物を作るプロジェクトの話で、workflowの無いこのPJでは人間が手で作る。v1.1.1で、毎回Releasesを作っていることを確かめずに「載せたい場合は」と案内してしまった
- 版を上げるかの目安：**`.vsix`に入るコード（`src/`・`package.json`・`media/`・`README.md`など。`npx vsce ls`に出るもの）が前のタグから変わったら**、利用者に見える違いが無くても、次の変更の予定が無ければ早めに出す。公開中の版とコードが長く食い違わないようにするため（人間の判断、q&a`1553ba0462`）。ルール・CI・テスト・devcontainerだけの変更は、`.vsix`に入らないので版を上げない

## リリースの流れ

ビルド済みのバイナリなどを GitHub Releases で配るときは、次の流れにする。

1. **人間が**タグ（`v0.1.0`の形）を打って push する
2. タグで動く workflow（`.github/workflows/release.yml`）が、テストを通してから配布物を作り、**下書きの Release**（`--draft`）に添付する
3. **人間が**下書きの中身を見て、公開する

- **Claude Codeは、タグも Release も作らない。** `gh release create`は`.claude/settings.json`で拒否（deny）されている。Release を作るのは workflow の中だけ
- `release.yml`と、配布物の作り方（goreleaser、または`qsokufile`の自前の項目）は、プロジェクトが選ぶ。このリポジトリには、今は無い（Marketplace で配るため）
- ビルド済みのバイナリは、リポジトリにコミットしない（`.claude/rules/directory-structure.md`「配布物」）
