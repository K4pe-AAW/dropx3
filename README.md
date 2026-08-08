# DROPWIRE

スニーカー＆ストリートファッションのニュース・アフィリエイトメディア。
[uptodate.tokyo](https://uptodate.tokyo/) の構成（新着/おすすめタブ、ブランドタグ、月別アーカイブ、
商品への購入導線）を参考にしつつ、デザイン・コード・収集パイプラインはゼロから独自に実装している。

`../4over-fashion-news`（40代男性向けメディアの社内キュレーションツール）とは別プロジェクト。統合しない。

## まず最初にやること

1. **ブランド名を決める** — [lib/site-config.ts](lib/site-config.ts) の `siteConfig.name` / `tagline` /
   `operatorName` / `contactEmail` を編集する（"DROPWIRE" は仮名）。この1ファイルを直せばヘッダー・
   フッター・メタタグ・法的ページ全部に反映される。
2. `.env.example` を `.env.local` にコピーして値を埋める。
3. `npm install && npm run dev` → http://localhost:3000

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 技術構成

Next.js 16 (App Router) / TypeScript / Tailwind CSS v4。データは Vercel Blob 上の
articles.json / drafts.json への読み書き（[lib/storage.ts](lib/storage.ts)）。
リレーショナルDBは使わず、フラットなJSONを丸ごと読み書きする方式は維持しているが、
Vercelの本番環境はファイルシステムへの書き込みが永続化されないため、ローカルファイルでは
なくBlobストレージを使っている。`BLOB_READ_WRITE_TOKEN`が未設定だとエラーになる
（ローカルファイルへのフォールバックはない）。初回セットアップは下記「Vercel Blobのセットアップ」参照。

- `lib/site-config.ts` — サイト名・タグライン等の一元設定
- `lib/types.ts` — Article / Draft の型定義
- `lib/storage.ts` — articles.json / drafts.json のBlob読み書き(非同期)
- `lib/affiliate.ts` — アフィリエイトリンクの安全な描画（rel属性、http(s)以外のスキームを拒否）
- `components/` — Header/Footer/ArticleCard/AffiliateCTA等の共通UI
- `app/` — ページ本体（下記「ページ構成」参照）

## コンテンツの2つの入り口

### 1. 手動で articles.json に追記する

一番シンプルな方法。`data/articles.json` の1要素をコピーして書き換えるだけ。
`Article` 型は [lib/types.ts](lib/types.ts) を参照。`slug` はURLになるので重複しないこと。

### 2. 収集パイプライン（RSS収集 → AI下書き → 人間レビュー → 公開）

```bash
npm run collect
```

[lib/sources.ts](lib/sources.ts) に登録した公式RSS（FASHIONSNAP / HYPEBEAST JAPAN /
UPTODATE / FULLRESS）と、キーワードで絞り込んだPR TIMESのプレスリリースを取得し、OpenAI
(`gpt-4o-mini`) にDROPWIRE独自の文章として書き直させ、`data/drafts.json` に保存する。
**この時点では一切公開されない。**AIは出典の文章を丸写しせず事実ベースでゼロから書くよう
プロンプトで指示している（[lib/ai-draft.ts](lib/ai-draft.ts)）ため、収集元が増えても
「他メディアの文章をそのまま転載する」ことにはならない設計。

その後、http://localhost:3002/admin （要 `ADMIN_PASSWORD`）で下書き一覧を確認し、各下書きを開いて

- 本文の事実確認・修正（AIの出力は必ず人間がチェックすること）
- カバー画像URLの入力（**必須**。AIは画像を生成しないので、下記「画像の調達方針」に沿って
  用意する）
- アフィリエイトリンクの入力（**AIには実在しないURLを生成させていない**。`suggestedAffiliateSearch`
  に出てくるキーワードでA8.net/バリューコマースの管理画面から実際のリンクを検索し、貼り付ける）

#### 画像の調達方針

uptodate.tokyo・FULLRESSと同じ運用（ブランド公式が提供した画像を保存して自己ホスト）に揃えている。
[public/images/](public/images/) に保存し、記事からは`/images/xxx.jpg`のようにローカルパスで参照する
（外部ホットリンクはしない）。

- **OK**: FASHIONSNAP（画像に"Image by: [ブランド名]"表記あり）、HYPEBEAST JAPAN（画像に配信元
  ブランド名が明記）、PR TIMESの「素材をダウンロード」（報道機関向けに明示的に提供されている）
  → いずれもブランドが提供した画像を転載しているだけと確認できるソース
- **NG**: HOUYHNHNM・EYESCREAM等、"Photography_◯◯"のような撮影者クレジットが入る自社発注の
  オリジナル記事が中心のメディア → その媒体自身の著作物なので画像は使わない（`lib/sources.ts`
  からも情報源として除外済み。テキストをAIが書き直しても、画像を転載すればその媒体の著作物を
  そのまま使うことになるため）
- 上記いずれにも該当しない/確認が面倒な場合は、`https://placehold.co/...`のプレースホルダーで
  代用する（シード記事と同じ体裁）。「ブランド提供画像かどうか自信が持てないなら転載しない」が原則。

を行ってから「公開する」を押すと Blob上の articles.json に反映される。

外部cronから定期実行したい場合は `GET /api/cron/collect` を叩く。認証は
`Authorization: Bearer $CRON_SECRET`（[vercel.json](vercel.json)のVercel Cronが自動送信）
または `x-cron-secret: $CRON_SECRET` ヘッダーのどちらでも通る。

uptodate.tokyoはデザイン参考元だが、RSS配信とrobots.txtでのクロール許可を他の競合4誌と同条件で
確認できたため収集元に含めている（デザインを参考にしたことと、ニュースの一次ソースとして
公開RSSを読むことは別の話という整理）。
ソースを追加する場合は `curl -I <feed-url>` で200が返ることと `curl <site>/robots.txt` の内容を
確認してから `lib/sources.ts` に追記すること。

### Vercel Blobのセットアップ（本番・ローカル共通で必須）

1. Vercelダッシュボード → プロジェクト → Storage → Create Database → Blob
2. プロジェクトに接続すると `BLOB_READ_WRITE_TOKEN` が自動でVercel側の環境変数に入る
3. ローカルでも同じ値を `.env.local` に追加する（`vercel env pull .env.local` でも可）
4. 初回のみ、ローカルの `data/articles.json` / `data/drafts.json` の内容をBlobへ移す:
   ```bash
   npm run seed-blob
   ```
   以後はBlob側が正のデータになる。ローカルの `data/*.json` は初期シード用の控えとして残るだけで、
   アプリはもう読みに行かない。

### 本番の自動実行について

[vercel.json](vercel.json) に `GET /api/cron/collect` を毎時実行するVercel Cronを設定済み。
Vercel側で `CRON_SECRET` を設定していれば追加作業なしで動く(Mac側のスリープ状態に左右されない)。

### ローカル自動実行について（開発機のみ・任意）

開発機のuser crontabに以下を登録すれば、ローカルでも1時間ごとに収集→AI下書き生成が走る
（`npm run dev` を起動していなくても、`scripts/collect.ts` を直接叩く方式なので動く）。
ただし本番相当の自動化はVercel Cron側で完結するので、これは開発時の動作確認用途が主。

```
0 * * * * cd /Users/koh/Desktop/claude01/dropwire && /usr/local/bin/npx tsx scripts/collect.ts >> /Users/koh/Desktop/claude01/dropwire/log.txt 2>&1
```

- ログ: [log.txt](log.txt)（このファイル自体はgit管理しない想定。`.gitignore`に追記済み）
- 停止・頻度変更: `crontab -e` で該当行を削除 or 書き換え（例: 30分毎なら `*/30 * * * *`、15分毎なら`*/15 * * * *`）
- 前提: `.env.local` に有効な `OPENAI_API_KEY` と `BLOB_READ_WRITE_TOKEN` が入っていること。
  後者が空だと収集自体がエラーで落ちる。前者が空だとRSS取得はできてもAI下書きが全件エラーになる
  （下書き0件のまま）。いずれもエラーは出るが落ちない設計なので、キーを後から入れれば次回の
  実行から自動で復旧する。
- ノートPCの場合、その時刻にスリープしていれば実行機会自体がスキップされる(cron/launchd共通の
  制約で、後から取り戻すような追いつき実行はしない)。四六時中確実に回したいなら上のVercel Cronに
  任せるのが確実。
- RSS取得先（HOUYHNHNM等）への配慮として、頻度を上げすぎないこと。
- PR TIMESは`lib/sources.ts`の`PR_TIMES_KEYWORDS`でファッション文脈に絞り込み済み。ただし単発の
  誤爆（無関係な業界の「コラボ」記事等）が下書きに紛れる可能性はゼロではないので、`/admin`での
  却下は引き続き最後の砦として機能する。

## 管理画面 (`/admin`) の認証について

`ADMIN_PASSWORD` をcookie(sha256ハッシュ化・httpOnly)で照合する簡易的なパスワードゲート
（[proxy.ts](proxy.ts) / [lib/admin-auth.ts](lib/admin-auth.ts)）。本番公開する場合、
より強固な認証が必要ならVercel等のBasic認証機能やIP制限を重ねることを推奨する。
`ADMIN_PASSWORD` を設定しないと `/admin` には一切入れない（安全側のデフォルト）。

## 法令・アフィリエイト表記について

日本のステマ規制（景品表示法、2023年10月施行）対応として、アフィリエイトリンクを含む記事には
自動で「PR」バッジが付く（[components/AffiliateCTA.tsx](components/AffiliateCTA.tsx)）。
フッターとも連動する [app/disclaimer/page.tsx](app/disclaimer/page.tsx)（アフィリエイト表記・免責事項）
と [app/privacy/page.tsx](app/privacy/page.tsx)（プライバシーポリシー）は既に用意済みだが、
**運営者名・連絡先などのプレースホルダーは公開前に必ず実情報に差し替えること**。
A8.net等のASP審査でもこれらのページの実在が求められることが多い。

アフィリエイトリンクは必ず [lib/affiliate.ts](lib/affiliate.ts) の `AffiliateCTA` コンポーネント経由で
描画すること。`rel="sponsored nofollow noopener noreferrer"` の付与と `javascript:` 等の危険なURLの
除外をここで一括して行っているため、素の `<a>` タグで直接埋め込まない。

## ページ構成

| パス | 内容 |
| --- | --- |
| `/` | トップ（新着/おすすめタブ + サイドバー） |
| `/category/[sneaker\|fashion]` | カテゴリー別一覧 |
| `/brand/[brand]` | ブランド別一覧 |
| `/archive/[YYYY-MM]` | 月別アーカイブ |
| `/articles/[slug]` | 記事詳細 |
| `/search?q=` | キーワード検索 |
| `/about` `/privacy` `/disclaimer` | 運営情報・法的ページ |
| `/admin` `/admin/drafts/[id]` `/admin/login` | 下書きレビュー・公開（要ログイン） |

## 既知の制約・今後の課題

- **サーバーレス非対応**: `data/*.json` はファイルシステムに書き込むため、Vercel等のサーバーレス環境では
  公開・下書き保存が永続化されない。VPSやDocker等、ファイルシステムが永続する環境での運用を前提にしている
  （4over-fashion-newsと同じ制約）。将来的に規模が大きくなるならDB移行を検討。
- **「人気の投稿」は実アクセス解析に基づいていない**: 現状は `featured` フラグの記事を代用表示している。
  本物のランキングにするにはGA4連携か簡易ビューカウンターの実装が必要。
- **画像**: シード記事のカバー画像は `placehold.co` のプレースホルダー。実運用では提携ASP/ブランドが
  提供する商品画像、または自分で用意した画像に差し替える。
- **ページネーション未実装**: 一覧系ページは直近の記事のみ表示（最大24件）。記事数が増えたら追加が必要。
