# テスト方針

## 開発環境の前提

開発者の手元環境は**Linux（devcontainer）のみ**。Windows・macOSでの動作確認は手元では行わず、GitHub Actionsのホステッドランナーに委ねる（`.github/workflows/ci.yml`の3OSマトリクス）。

## 実装後の動作確認

実装したら、ビルド確認に加えて実際の動作確認を行うこと。ロジック上正しそうに見えても、動かして初めて見つかる不具合はある（下の「動かして確かめる」）。

- `qsoku check`（ビルド・単体テスト）は作業の区切りで必ず通す
- 拡張開発ホストに関わる変更は`qsoku test`も通す（サンドボックスの外で動かす。下の「Bashサンドボックスの落とし穴」）
- 依存を足したら`qsoku trivy`（既知の脆弱性・ライセンス）を通す
- シェルスクリプトを足したら`qsoku shellcheck`を通す（`git add`してから走らせる。追跡中のものだけが対象）

## 使うツール（mtqgと同じ）

- **qsoku**：`qsokufile`ができたら、build・check・test・trivy・shellcheckの入口をmtqgと同じ形で用意する（`qsokufile`はコマンドの近道であり、シェルではなく`sh`で毎回同じに動く。詳細はqsoku自身のドキュメント）
- **Trivy**（`trivy.yaml`）：npmの依存の既知の脆弱性とライセンスを検査する。依存を足すたび・`package-lock.json`が変わるたびに通す
- **ShellCheck**：追跡中の`.sh`（`.devcontainer/postCreate.sh`、`.claude/hooks/`）にかける（下の「ShellCheck」）
- **`qsoku hook`**：bcuzを強制するフックの判定の表（`.claude/hooks/require-bcuz.test.sh`）。`require-bcuz.sh`を変えたら通す

## ShellCheck：シェルスクリプト

- シェルスクリプトは最小限にする
- `qsoku shellcheck`は`git ls-files '*.sh' '*.bash'`で追跡中のものを列挙してShellCheckにかける（`git add`してから走らせる）
- シェルスクリプト中のコメントを、行頭が小文字の`# shellcheck`で始まる文にしてはいけない（ShellCheckがインラインディレクティブとして誤解釈し、SC1072/SC1073でパースエラーになる）。「ShellCheck」のように大文字を混ぜて書く
- **`postCreate.sh`の中で`. /etc/os-release`をsourceしない。** ShellCheckのSC1091（追えない形で指定されたファイル）が情報の水準で報告され、終了コードが0でなくなる。ディストリビューションの版は`lsb_release -rs`で取る
- `# shellcheck disable=…`は、`case`の枝の前には置けない（SC1124 のパースエラー）。`case`の文の前に置くと、全部の枝に効く

## Trivy：既知の脆弱性とライセンス

- `trivy fs`で、npmの依存の既知の脆弱性（CVE）とライセンスを検査する（`qsoku trivy`）
- 何を失敗とみなすか（深刻度、禁止するライセンスの種類）は`trivy.yaml`で固定する
- `npm install`で依存を足したら、必ずTrivyを通す
- Trivyは脆弱性データベースの取得に通信が要る（下の「Bashサンドボックスの落とし穴」）

## シェル向けのもの：補完のスクリプト・シェルとの連携

- devcontainer のシェルは、`postCreate.sh`の`shells`で決める。初めは`(bash)`だけ
- 補完のスクリプトなど、自分のシェル向けのものを配るプロジェクトは、**本物のシェルで動かして確かめる**。`shells`を`(bash zsh fish pwsh)`にし、`devcontainer.json`の`features`に`"ghcr.io/devcontainers/features/powershell:2.0.3": {}`を足して、コンテナを作り直す（bash・zsh はベースイメージ、fish は`postCreate.sh`の apt、pwsh は feature）。`pwsh`を挙げて feature が無いと、`postCreate.sh`が止まる
- テストは、入っていないシェルを飛ばす（CI のランナーにあるのは bash と`pwsh`）。飛んだときは、コンテナを作り直したかを確かめる。何を候補にするかは単体テストで見て、本物のシェルのテストは「スクリプトがシェルとつながること」だけを見る

## 拡張自身のテスト

- テストランナーは`node:test`（`.claude/rules/dependencies.md`）。VSCode APIを使わないテスト（`test/unit/`）はそのまま`node --test`で走る
- **VSCode APIを使うテスト（`test/vscode/`）は、`@vscode/test-electron`で拡張開発ホストを起動し、その中で`node:test`の`run()`を呼ぶ**（`@vscode/test-cli`は使わない。mochaを内部で使うため）。`test/vscode/runTest.ts`が起動元、`test/vscode/suite/index.ts`が`run()`を呼ぶ側
  - `run()`には`isolation: 'none'`を渡す。既定（`'process'`）は各テストファイルを子プロセスで実行するが、子プロセスには拡張開発ホストが注入する`vscode`モジュールが無い
  - **`isolation: 'none'`にすると、テストの完了を`stream`の`finished`イベントで検知できない。** 拡張開発ホストのような常駐プロセスは常に何かのバックグラウンド処理を抱えていて「何もしていない」状態にならないため、node:testが使う待機（アイドル検知）が成立せず、`test:complete`は個々のテストごとに発火するのに`test:summary`・`test:plan`は発火しない（不具合、todo`97779f964e`で発見・記録）。代わりに、`test:complete`が一定時間（1秒）止んだら「そのファイルは完了した」とみなす方式にする（`test/vscode/suite/index.ts`）
- mtqgとのつながり（`.claude/rules/mtqg-cli.md`）は、実際に`mtqg`のバイナリを子プロセスで起動して確かめる（mtqgのe2eが本物のバイナリと本物のgitを使うのと同じ考え方。モックで済ませない）
- UIの見た目（Webview）は、DOM操作のロジックをVSCode APIから切り離してテストできる形にする（画面を持たないテストで確かめられる部分を増やす）。`src/webview/shared/html.ts`の`renderShell`・`src/webview/controller.ts`はこの形で、`test/unit/`から本物のmtqgバイナリを使って呼べる（`test/unit/webview/controller.test.ts`）
- **`src/webview/client/`（Webview内で実際に動くスクリプト）は`node:test`の対象外。** DOM APIが無いNodeでは実行できない。ロジックはできる限り`controller.ts`・`shared/`側（ホスト、vscode非依存）に寄せて、そちらをテストする。`client/main.ts`自体は「動かして確かめる」で見る
- **`test/vscode/runTest.ts`は、`.mtqg/`を初期化した一時リポジトリをワークスペースとして開く**（`--disable-workspace-trust`と併用。信頼ダイアログがヘッドレス実行を止めないため）。ワークスペースが無いと`vscode.workspace.workspaceFolders`が空になり、`openPanel`（`src/webview/panel.ts`）の`FileSystemWatcher`・`controller`を作る分岐がテストで一度も通らない（todo`b9caf0b88c`で発見。それまでの`test/vscode/`はワークスペース無しで動いていた）
- **プレーンな`tsc`（`--build`/`composite`を使わない今の構成）は、削除済みのソースに対応する出力を消さない。** テストファイルを削除しても、古い`out/`の`.js`がそのまま残り`node --test`に拾われ続け、存在しないはずのテストが通り続ける（不具合：`mtqg.createAt`廃止で`test/unit/commands/at.test.ts`を消したのに、`qsoku unit`のテスト数がその後もしばらく減らなかった）。`qsokufile`の`build`は`rm -rf out`してから`tsc`する

## テストの書き方

- **期待値は、テストを書く前に決める。** 推測で埋めて、落ちてから直す、をしない
  - **計算で決まる値**（ハッシュ・表示幅・日時の書式など）は、実装とは別の道具（`sha256sum`など）で求めて書く。実装の出力を写すだけでは、実装の誤りを固定してしまう
  - **動かして決まる値**（走査・照合の結果など）は、先に実装を動かして出力を読み、1件ずつ正しいと確かめてから貼る
  - **件数より中身で比べる**（名前の一覧など）。件数は数え間違えても気づきにくく、落ちたときに何が違うか分からない
  - テストが落ちたときは、実装と期待値のどちらが誤りかを先に確かめる
  - 「〇〇と同じ書式・動き」と仕様にあるものは、その本家を道具として使って期待値を求める（gitignore の書式なら`git check-ignore`。パスに末尾の`/`を付けて聞くと、ディレクトリそのものの判定が本来と変わることがある。付けずに聞く）
- **gitを使うテスト（`test/helpers/tempRepo.ts`の一時リポジトリなど）は、開発者の設定の影響を受けないようにする。** `HOME`と`GIT_CONFIG_GLOBAL`を一時ディレクトリに向け、`user.name`・`user.email`はテストの中で決める（子プロセスに渡す`env`で）
  - このPJでは`test/helpers/tempRepo.ts`が、読み込まれたときにテストのプロセスの`process.env`をその場で書き換える（`HOME`・`GIT_CONFIG_GLOBAL`は一時ディレクトリ、`GIT_CONFIG_NOSYSTEM=1`、`user.name`・`user.email`は`GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n`）。テストするコード（`src/mtqg/process.ts`）がmtqgを`process.env`のまま起動するため、子に個別に渡すのでなく、テストのプロセスごと切り替えている。**ただし、`test/vscode/runTest.ts`から起動する本物のVS Codeには、`HOME`・`USERPROFILE`・`XDG_CONFIG_HOME`だけ開発者のもとの値を渡す**（`tempRepo.ts`の`developerHomeEnv`を`runTests`の`extensionTestsEnv`で）。偽の`HOME`のまま起動すると、macOSのCIで`qsoku test`が終わらなくなった（bug`7290a04665`。LinuxとWindowsは通るので、手元では気づけない）。gitの`user.*`の指定と`MTQG_AUTHOR_*`の削除は、VS Codeが動かすmtqgにもそのまま効く
  - **`MTQG_AUTHOR_KIND`・`MTQG_AUTHOR_NAME`・`MTQG_TTY`も消す。** Claude Codeの中では`.claude/settings.json`の`env`で`ai`/`claude-code`が立っており、残すとAIの中とCIで記録者が変わる（mtqgは`MTQG_AUTHOR_NAME`が無いとき、gitの`user.name`を使う）。`test/unit/helpers/tempRepo.test.ts`が、記録者が`test`（human）になることを確かめる
- **ソースに、見えない文字（ゼロ幅、U+2028・U+2029、結合文字、文字の向きを変える制御文字、そのほかの制御文字）をそのまま書かない。** エスケープ（`\u200b`・`\x00`など）で書く。書き込みの途中で本物の文字に置き換わると、見た目では気づけない不具合になる
  - srwrの`edit`・`new`の引数はJSONで渡るので、バックスラッシュと`u`で始まるエスケープは、引数の段階で本物の文字になって届くことがある（Go のソースで、U+2028・U+2029・U+0301・U+200Dで実測）。何の文字かは、コメントかテストの名前に残す
  - 書いたあとに`grep -P '[\x{2028}\x{2029}\x{200D}\x{0301}]'`で、本物の文字が無いことを確かめる

## この開発環境（devcontainer）固有の落とし穴

- **`ELECTRON_RUN_AS_NODE=1`がコンテナ全体の環境変数として立っている**（remote-cliの`code`シム用）。`@vscode/test-electron`がダウンロードするVS Code本体にこれが継承されると、そのElectronバイナリが素のNodeとして起動してしまい、`--extensionDevelopmentPath`などのCLIフラグがすべて「bad option」で失敗する。`qsokufile`の`test`ターゲットで`env -u ELECTRON_RUN_AS_NODE`を付けて対処している（不具合、todo`97779f964e`）
- **`trivy fs`は既定で`devDependencies`を無視する。** この拡張は実行時の依存が常に0なので、`--include-dev-deps`を付けないと何もスキャンされない（`qsokufile`の`trivy`ターゲットで対処済み）

## Bashサンドボックスの落とし穴

> devcontainer内でClaude Codeが実行するBashコマンドは、既定でOSレベルのサンドボックス（Linux bubblewrap）にかかる。`.claude/settings.json`の`sandbox`でファイルシステムの書き込み先とネットワーク接続先を許可リストで絞っている（2026-09-30導入、CLAUDE.md「権限・自動化について」）。ここは、その設定の下で`qsoku check`・`qsoku test`・`qsoku trivy`・`qsoku shellcheck`・`npm ci`を実際に動かして見つかった落とし穴の記録。

- **Linuxでは`bubblewrap`（`bwrap`）と`socat`が無いと、`settings.json`に`sandbox.enabled: true`があってもサンドボックスは警告なしに無効のまま動く。** 許可リスト外のドメインに接続できる・ダミーの`.bashrc`等が出ない、が兆候。`.devcontainer/postCreate.sh`が、無いものだけを`apt-get install`する（ベースイメージによっては最初から入っているため、入っているか確認してから入れる。プロジェクトに依存しないブロックなので、他のリポジトリにもそのまま使える）
- **Xvfbを使うもの（`qsoku test`＝`xvfb-run`＋実VS Code、「動かして確かめる」のスクリーンショット手順）は、Linuxのサンドボックスの中では動かない。** Xvfbはunixドメインソケットで待ち受けるが、LinuxのサンドボックスはネットワークネームスペースでUnixソケットを全部使えなくしており（`$TMPDIR`でも`listen`が`EPERM`）、`allowUnixSockets`・`allowAllUnixSockets`はLinuxでは効果がない（公式ドキュメント）。症状は、`xvfb-run -a`が`:99`、`:100`、…と延々失敗して`DISPLAY`だけ割り当て、VS Codeが`Missing X server or $DISPLAY`で`SIGTRAP`になる（bug`2d4ad01d30`。`qsoku check`・`trivy`・`shellcheck`・`npm ci`は影響を受けない）。`allowWrite`で`/tmp/.X11-unix`や`/tmp`を許可しても解決しない（途中の`Could not create lock file`が消えるだけ）。**対処は`sandbox.excludedCommands`に`qsoku test`・`xvfb-run *`を入れ、サンドボックスの外で動かす**（確認ダイアログが出ないよう`permissions.allow`にも同じ2つを入れる）。**Bashのコマンドは`bcuz`を通す**（`.claude/rules/bcuz-usage.md`）ので、`excludedCommands`・`permissions.allow`には、`bcuz`付きの形（`bcuz * qsoku test`・`bcuz * xvfb-run *`）も入れる（2026-10-15。`bcuz "…" qsoku test`がサンドボックスの外で通ることを確かめた）。**`excludedCommands`に一致するのは、そのコマンド単体で実行したときだけ。** `qsoku test > log 2>&1; ...`のようにリダイレクトや`;`でつなぐと一致せず、サンドボックスの中で動いて同じ`SIGTRAP`になる。ログを取りたいときも`qsoku test`単体で実行する。付随して出る`~/.vscode/argv.json`のEROFS警告・`update.code.visualstudio.com`の名前解決失敗（インストール済みの版にフォールバック）・Fontconfigのキャッシュ警告は、テストの結果に影響しない
- **Trivyの脆弱性DBの取得先は`ghcr.io`ではなく`mirror.gcr.io`（`mirror.gcr.io/aquasec/trivy-db:2`）。** 名前から`ghcr.io`（GitHub Container Registry）を許可すればよいと思い込むと、`qsoku trivy`が`sandbox_violations`で失敗する。実際に動かして初めて分かった（bug`3f91787d2c`）
- **Trivyの脆弱性DBは`~/.cache/trivy`に書き込む。** `filesystem.allowWrite`にこれが無いと、ネットワークを許可してもダウンロード後の書き込みで`read-only file system`になる（`.claude/settings.json`で対処済み）
- **`filesystem.allowWrite`は、既に存在するパスしか効かない。** `~/.cache`自体は書き込み不可なので、`~/.cache/trivy`・`~/.cache/go-build`・`~/.npm`が無いまっさらなコンテナでは、最初の`qsoku trivy`・`npm ci`等が`read-only file system`で失敗する。`.devcontainer/postCreate.sh`が`settings.json`の`allowWrite`を読んで全部先に`mkdir -p`する（mtqg本体で先に見つかった落とし穴。一覧を二重に持たないので、`allowWrite`を変えてもスクリプトの修正は要らない）
- **`check.trivy.dev`への接続（Trivyのバージョン確認機能）は、許可リストに無くても`qsoku trivy`の結果・終了コードには影響しない。** `sandbox_violations`として警告は出るが、スキャン自体（脆弱性・ライセンスのレポート）は正常に完了する。実害のない拒否なので許可リストに足すかは任意
- **`git fetch`・`git pull`（リモートのgithub.comへの読み取り）と`gh pr create`には`github.com`・`api.github.com`への許可が要る。** この拡張の運用ルールで禁止しているのは`git push`だけなので、fetch/pullはask・denyどちらにも入らず素通りする想定だが、サンドボックスのネットワーク許可が無いと接続自体がブロックされる（`.claude/settings.json`で対処済み）
- **許可リストに無いものに当たったら、自分で回り道を探し続けない。** `.claude/rules/working-with-human.md` 2章の形で、何をどこに足すかを短く頼む
- **`sudo`は、サンドボックスの中では承認しても失敗する。** サンドボックスのuidの付け替え（特権の無いユーザー名前空間）で、本来rootが持つファイルがnobodyの持ち物に見え、`sudo`自身の所有者の確認に落ちる。`sudo`が要るときは、人間のターミナルで動かすよう頼む（`.claude/rules/working-with-human.md` 2章）
- **このコンテナのGOPATHは`~/go`ではなく`/go`（ホームディレクトリの外）。** `go env GOPATH`で確認せずに`~/go`を`filesystem.allowWrite`に入れると、`.devcontainer/postCreate.sh`のような`go install`を伴う操作で書き込みが拒否される（`.claude/settings.json`で対処済み）
- **道具のリリースのタグが打たれた直後にコンテナを作り直すと、前の版が入ることがある**（srwr の v0.3.0 で起きた）。Go のモジュールプロキシは`@latest`の答えをしばらく覚えているので、`postCreate.sh`の`go install …@latest`が前の版を入れ、その版に無い補完も警告を出して飛ばす。作り直したら、新しく出た道具の`--version`を見る。古ければ`go install github.com/amisonnet8/<道具>/cmd/<道具>@<新しい版>`で入れ直し（`proxy.golang.org`・`sum.golang.org`・`storage.googleapis.com`への接続が要る）、補完は人間のターミナルで入れ直す（書き先がサンドボックスの外）
- **`srwr init`は、書き換えるものがあるときは、サンドボックスの中では`.mcp.json`・`.claude/settings.json`を置き換えられない（書き換えが無ければ動く。そもそもテンプレートから作ったプロジェクトでは動かさなくてよい）**（一時ファイルを`rename`する先が書き込み保護で、`device or resource busy`。`.srwr/`の鍵だけが先にできる）。人間のターミナルで動かす（`.claude/rules/srwr-usage.md`「落とし穴」）。`srwr view`は`~/.cache/srwr`に書くので、同じく人間のターミナルで動かす
- **サンドボックスの書き込み保護（`filesystem.write.denyWithinAllow`）が、作業ディレクトリ直下に`.bashrc`等のダミーファイルを出現させることがある。** `git status`に大量の未追跡ファイルとして見えて驚くが、`ls -la`で見ると中身が空のキャラクタデバイス（`/dev/null`相当）で、未追跡のままなのでコミットには影響しない。この拡張の実装やリポジトリの状態には起因しない、サンドボックス機構側の挙動。`.gitignore`はルート直下と`.claude/`直下のドット始まりをまず全部無視し、追跡するものだけ`!`で戻す許可リスト方式にしてあるので、`git status`にも出ない（新しく追跡するドット始まりのファイル・ディレクトリを足すときは`.gitignore`に`!`行が要る）

- **`qsoku package`（`vsce package`）は、サンドボックスの中では失敗する。** 作業ディレクトリ直下のダミーファイル（`.bash_profile`・`.bashrc`等、上の項目）をvsceのsecretlintが読もうとして`EACCES`になる。中身の確認だけなら`npx vsce ls`が通る（ダミーの点ファイルが一覧に混じるが、実際のリポジトリにはなく、無視してよい）。実際の`.vsix`づくりは、サンドボックスの外の人間のターミナルで行う
- **公開前に`npx vsce ls`で、パッケージに入るファイルを必ず目で確かめる。** `.vscodeignore`に載っていないものは、そのまま公開物に入る。srwr導入後の初回確認で、`.srwr/key`（鍵）・`.srwr/lock`・`.srwr/tapes/`が入っていた（todo`77f9e71300`）。`.vscodeignore`が主要な作業用ディレクトリを除外していることは、`test/unit/vscodeignore.test.ts`が検査する——新しい作業用ディレクトリ（ツールの状態置き場など）を足したら、`.vscodeignore`と、このテストの一覧の両方に足す

## 壊して確かめる、という考え方

mtqgの`mutation-check`（実装を1か所ずつ壊してテストが落ちるかを見る）と同じ考え方を持ち込む：**通るだけのテストは、効いているとは限らない。** 今は実装が薄いので専用のSkillは作らず、区切りごとに手で確かめる。同じ手順を繰り返すようになったら、mtqgのSkillに倣って専用のスクリプトを作ることを検討する
- **記録の本文を確かめるテストは、部分一致（`assert.match`で含むかだけ見る）ではなく完全一致（`assert.equal`）にする。** `client.ts`の`edit`・`glossaryAdd`・`qaAnswer`・`bugReply`が本文の前に余計な`--`を混入させる不具合（`.claude/rules/mtqg-cli.md`）を、まさに部分一致のテストがすり抜けさせていた（`"-- foo"`は`/foo/`にマッチしてしまう）。todo`daf43fc83d`で、人間が実際にUIを操作して初めて発覚した

## 動かして確かめる

- ロジック上正しそうに見えても、拡張開発ホストで実際に動かして初めて見つかる不具合はある。作業の区切りでは、テストに加えて実際に画面を開いて確かめる
- **人間がこのdevcontainerに接続したデスクトップ版VS Codeで`F5`（デバッグ実行）すると、拡張機能ホストが起動直後に固まることがある**（`--inspect-brk`でデバッガの接続を待つ状態のまま、リモート経由だと接続が来ず、コマンドが一つも登録されない＝「not found」になる。todo`daf43fc83d`で人間が遭遇）。**`Ctrl+F5`（Run Without Debugging）を使えば、デバッガの接続を待たずに起動できる。** F5を繰り返すと固まったプロセス（`ps aux | grep inspect-brk.*extensionHost`）が溜まるので、必要なら`kill -9`で片付ける
- **Webviewの見た目は、`node:test`では確認できない**（CSPがスクリプトを止めていないか、`asWebviewUri`のパスが正しいか、実際にテーマ色が反映されるか、など）。この環境（Xvfb）でスクリーンショットを取って確かめる手順（todo`b9caf0b88c`で確立）：
  1. `Xvfb :N -screen 0 1280x800x24 &`（`env -u ELECTRON_RUN_AS_NODE`付き）
  2. ダウンロード済みのVS Code本体（`.vscode-test/vscode-linux-x64-*/code`）を`DISPLAY=:N`・`--extensionDevelopmentPath=<このリポジトリ>`・`--disable-gpu --disable-workspace-trust --no-sandbox --skip-welcome --skip-release-notes`・一時mtqgリポジトリのパス（ワークスペースとして開く）・`--remote-debugging-port=<port>`で起動（`--disable-extensions`は付けない。拡張自体も無効化されてしまう）
  3. コマンドパレット経由の操作はキー入力の自動化ツール（`xdotool`等）が無いため、`http://localhost:<port>/json`でCDPのターゲット一覧を取り、ページ（`type: "page"`）のWebSocketへ`Runtime.evaluate`でDOM操作を直接実行する（例：オンボーディングダイアログのボタンをテキストで探してクリック）。実際のキー入力そのものが要る場面（コマンドパレットを開いて`mtqg: Open`や`Developer: Reload Window`を打つなど）は、同じWebSocketへ`Input.dispatchKeyEvent`（`rawKeyDown`→`keyUp`の組、文字送りは`type: 'keyDown', text: <1文字>`→`keyUp`）を送る——`document.dispatchEvent(new KeyboardEvent(...))`のようなDOM合成イベントはVS Codeのキーバインド処理には拾われない（`isTrusted`が立たないため）。ホストの拡張コードを直した後は、ウィンドウを開き直すのではなく同じ拡張開発ホストで`Developer: Reload Window`を打てば、ビルドし直した`out/`を読み直せる（todo`4e09f42a9f`で確立、Node 22の組み込み`WebSocket`クライアントでこの一連を書けた）
  4. `import -window root -display :N <path>.png`（ImageMagick）でスクリーンショットを撮り、Readツールで見る
  5. **Webviewの中身は、CDPターゲット一覧の`type: "iframe"`（`vscode-webview://...`、外側のラッパー）に接続し、そこから`document.querySelector('iframe').contentDocument`でもう一段入るとタブの中身に触れる**（同一オリジンなので、これで直接アクセスできる。訂正：todo`b9caf0b88c`時点では`srcdoc`で隔離されクロスオリジン扱いだろうと考えていたが、実際は同一オリジンで、単に一段ネストしているだけだった。VS Codeの外側ワークベンチ（`type: "page"`）から直接`document.querySelector('iframe')`しても見つからない＝そちらではなく`iframe`ターゲット側から辿ること）。クリックだけでなく、`contenteditable`な要素の`textContent`を書き換えてから`element.dispatchEvent(new Event('focusout', {bubbles:true}))`のように合成イベントを飛ばせば、実際にフォーカスを移動させなくても入力→確定の一連を再現できる。同じ`Runtime.evaluate`呼び出しを繰り返すと`const`の再宣言でエラーになるので、実行するスクリプトは`(() => { ... })()`のIIFEで包む
  6. 確認後は起動したプロセス（`code`・`Xvfb`）を`kill`し、一時ディレクトリを削除する（`pkill`はこの環境のサンドボックスで通らないことがある。`ps aux`で対象のPIDを見つけ、`kill -9 <pid...>`で個別に殺す方が安定する）
  7. **他のタブの`hidden`な内容も同じDOMに残っている。** `render`はそのタブの`panel-<id>`だけを書き換え、他のタブは`hidden`属性がつくだけで中身は消えない（起動直後の`ready`で最初に描画されたタブぶんも含む）。そのため`data-action="toggle-status"`のような共通セレクタを`document`全体に対して`querySelector`すると、見えている画面ではなく別の（隠れた）タブの要素を誤って掴むことがある（todo`8b7b600827`で発見：QA画面のチェックボックスのつもりがToDo画面の要素を操作していた）。CDPからの操作は必ず`#panel-<tab-id>`配下に絞る（例：`querySelector('#panel-questions [data-action="toggle-status"]')`）
- **この一連（一時リポジトリ作成→VS Code起動→CDPで操作→スクリーンショット）は、1本のNodeスクリプトにして`xvfb-run -a node <script>`の単体コマンドで実行すると、サンドボックスの外（`excludedCommands`の`xvfb-run *`）で動く**（todo`a597ec6df2`で確立）。起動するVS Codeの子プロセスには`ELECTRON_RUN_AS_NODE`を渡さない（スクリプト側で`delete env.ELECTRON_RUN_AS_NODE`）。コマンドパレットは`F1`→`mtqg: Open`を1文字ずつ`Input.dispatchKeyEvent`→`Enter`、Webviewは`type:"iframe"`のターゲット（`vscode-webview://`）へ繋いで`document.querySelector('iframe').contentDocument`。**スクロール位置の保持・追従のような「ブラウザでしか分からない挙動」は、この方法で`scrollTop`を読んで確かめた**（`node:test`では確かめられない）。注意：mtqgの`list`はID順なので、同じ秒に連続追加した記録の並びは不定（先頭／末尾を名指しで確かめる検証は、間に1秒以上あけるか、並びに依らない形にする）
- **`xvfb-run`も`qsoku test`も、`| grep`などでパイプにつなぐと`excludedCommands`に一致せず、サンドボックス内で動いて`Missing X server`・`SIGTRAP`・`platform failed to initialize`になる。** 出力を絞りたくても単体で実行し、出力が長いのは我慢する（todo`0822a2c167`で何度も踏んだ）
- **「ウィンドウのリロードで復元されるか」は`F1`→`Developer: Reload Window`→`Enter`で確かめる**（`WebviewPanelSerializer`の確認、todo`0822a2c167`）。再読み込み後に`type:"iframe"`の`vscode-webview://`ターゲットが再び現れ、選択中のタブ・描画内容が戻ることを見る。Xvfb上のリロードは数回に1回、ウィンドウが`The window terminated unexpectedly (reason: 'crashed', code: '133')`で落ちることがある（拡張のコードとは無関係、3回中1回）。落ちたら同じスクリプトを再実行して確かめる
- **`src/webview/shared/html.ts`のCSS・HTMLは1つのテンプレートリテラルの中にある。** CSSコメントにバッククォート（`` ` ``）を書くと、そこでテンプレートが終わってビルドが壊れる（todo`632bc617d7`で、todo番号を`` `…` ``で囲んで踏んだ）。このファイルのCSSコメントにはバッククォートを使わない
- この手順は6画面それぞれのtodoで繰り返す見込み。同じ手順を素の状態から毎回組み立てるのはコストなので、繰り返す段階でSkill化を検討する（提案済み、todo`b9caf0b88c`）

## CI（`.github/workflows/ci.yml`、todo`53cbaa3265`）

- **`check`ジョブは3 OS matrix（`ubuntu-latest`・`macos-latest`・`windows-latest`、`fail-fast: false`）。** CIを作った時点（2026-09-27）は**qsoku自体がまだWindows/PowerShellに正式対応していない**（人間から聞いたロードマップ：①qsokuのWindows/PowerShell対応→②そこで出た問題対応→③mtqg v1・正式公開）ため、`ubuntu-latest`固定だった（q&a`82fd9fe8fff2`）。①が済んだ（人間から確認、2026-09-27）ことでtodo`b7fe931ffa`にてmatrix拡張した。**mtqg本体のci.yml**（`github.com/amisonnet8/mtqg`、goモジュールキャッシュ`/go/pkg/mod/github.com/amisonnet8/mtqg@v0.4.0/.github/workflows/ci.yml`で実物を確認できる）に倣い、`qsoku check`・`qsoku test`のstepだけ`shell: bash`を明示している（Linux/macOSは元から既定がbashで無害、Windowsは既定のpwshではなくGit Bashを使わせる）。この拡張のコード自体にOS依存の分岐は無い（`mtqg`実行ファイルの解決はNode.jsの`execFile`のPATH解決に任せる設計、`.claude/rules/mtqg-cli.md`）
- 3ジョブ：`check`（`npm ci`→`qsoku`・`mtqg`をインストール→`qsoku check`→`qsoku test`、3 OS matrix）・`shellcheck`（`qsoku shellcheck`と`qsoku hook`、`ubuntu-latest`のみ）・`trivy`（`qsoku trivy`、`ubuntu-latest`のみ）。`shellcheck`・`trivy`は静的解析でOS依存の結果差が無いためmatrix化していない。いずれも`qsokufile`をそのまま呼ぶだけで、CI固有のロジックを持たない（ローカルの`qsoku check`等と同じコマンドが通ることがCIが通ることの前提になる）
- **`ci.yml`は、`release.yml`からも`workflow_call`で呼ばれる**（タグの push で、リリースの前に同じ検査を通す。`.claude/rules/distribution.md`）。`ci.yml`を変えると、リリースの検査も変わる。`on:`の`workflow_call`を消すと、リリースが動かなくなる
- `check`ジョブは`mtqg`もmatrixにし、最低版と`latest`の両方で試す（OS 3つ×mtqg 2つ）。最低版は`src/mtqg/availability.ts`の`MIN_SUPPORTED_MTQG_VERSION`とそろえる（`.claude/rules/mtqg-cli.md`「版」）。`.devcontainer/postCreate.sh`の`mtqg`は`@latest`で、これとは別物
- **`qsokufile`の`test:`エントリは`xvfb-run`の有無で分岐する**（todo`b7fe931ffa`）。`command -v xvfb-run`がある（このdevcontainerとCIの`ubuntu-latest`）ときだけ`env -u ELECTRON_RUN_AS_NODE xvfb-run -a`で包み、無い（`macos-latest`・`windows-latest`。元から実ディスプレイを持つランナーでXvfbが要らない）ときは`node`を直接呼ぶ。`uname`の文字列判定（Windows/MSYSでの表記揺れがある）ではなく、実際に使えるかどうかで判定している
- `qsoku test`（拡張開発ホストで実物VS Codeを起動）に必要なXvfb一式（`libnss3`等）は`.devcontainer/postCreate.sh`と同じ、動作確認済みのパッケージ一覧をそのまま`apt-get install`する。CIのci.ymlでは、このstepに`if: matrix.os == 'ubuntu-latest'`を付けている（Windows/macOSには`apt-get`が無い上、そもそも不要）
- `actions/checkout`・`actions/setup-go`の版・`go-version`はmtqg本体のci.ymlとそろえる（版の食い違いで「手元は通るがCIは落ちる」を避ける）
- **このLinux devcontainerからは、Windows/macOSのCI matrixそのものはローカルで実行・確認できない。** `qsoku test`のローカル実行で確かめられるのは常に`xvfb-run`分岐（Linux側）だけで、Windows/macOSでの成功は実際にpushしてGitHub Actions上で確認するしかない
- **`/dev/stderr`等のUnix固有のパスはWindows（Git Bash）で壊れる。** `tee /dev/stderr`などを使わず、標準のリダイレクトだけで書く
- **Windowsのcheckoutで改行がCRLFになると、整形や文字列の比較が全ファイルで食い違う。** ルートの`.gitattributes`（`* text=auto eol=lf`）で防ぐ
- **`uses: owner/repo@TAG`はタグ名と厳密に一致しないと失敗する。** `v`の有無を見落としやすい。書く前に実際のタグ名を確かめる
- **出力に出るパスと比べるテストは、一時ディレクトリを`fs.realpathSync`で解決してから比べる。** 同じディレクトリでも、macOSは`/var`→`/private/var`のシンボリックリンク、Windowsは8.3の短縮名（`RUNNER~1`）と長い名前が食い違う。`os.tmpdir()`・`fs.mkdtempSync`の値のまま比べると、macOS・WindowsのCIだけで落ちる
- **Windowsでは、開いたままのファイルを置き換え（`rename`）られないことがあり、開いたハンドルのあるディレクトリは消せない。** 一時ファイル経由の置き換えや、後片付け（`fs.rmSync`）の前に、先にファイルを閉じ、子プロセスの終了を待つ。Windowsのランナーでだけ落ちる
