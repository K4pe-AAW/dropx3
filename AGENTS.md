# This is NOT the Next.js you know

This project uses Next.js 16 (`node_modules/next/dist/docs/`), which has breaking
changes vs. older training data — dynamic route `params` are async (`Promise<{...}>`),
App Router file conventions apply. Read the relevant guide in
`node_modules/next/dist/docs/01-app/` before writing code you're unsure about.

# What this project is

DROP DROP DROP is a public affiliate media site (streetwear/sneaker news), modeled on the
structure of uptodate.tokyo but with an original design and its own content pipeline.
It is a separate codebase from `../4over-fashion-news` (an internal Slack-notifying
curation tool for a different, 40s-men-focused brand) — do not merge them.

- `lib/site-config.ts` — single source of truth for brand name/tagline/URL. Change
  the brand here, not by grepping across files.
- `data/articles.json` — published articles (served to the public site).
- `data/drafts.json` — AI-drafted candidates. The auto-publisher uses the 2026-09-04
  operating standard: it attempts drafts without a separate policy gate, while the
  publish preparation still requires body text, a usable source/reference, a cover
  image, and a concrete affiliate search term. Goss!p/leaks retain prominent
  unconfirmed labels. Each two-hour slot publishes at least 2 and at most 5 articles;
  if fewer than 2 qualify, later cron runs in the same slot retry the remaining drafts.
- Additional article images use a strict product-match filter: reject logos, social/recommended assets,
  transformed duplicates, and different products; when candidates pass those checks, keep up to 12 gallery images.
  SOURCE WATCH assets with unresolved rights remain review-only and must never be auto-published.
- The 髭ミルク YouTube source collects product-introduction videos only. Exclude モーニンググッド,
  嫁ヘルツ, radio/podcast, chat, and live-talk videos from collection and automatic publishing.
- A direct Rakuten product-detail page is sufficient evidence that the product exists: promote a `rumor`
  item to `report` and remove the Goss!p label when the article source, confirmed commerce link, or reviewed
  purchase channel contains that exact product page. Never use generated Rakuten search-result affiliate
  links, a Rakuten shop home, or a similar-product listing as this evidence. Keep genuine `leak` status.
- Affiliate links must go through `lib/affiliate.ts` so disclosure (`PR` badge,
  `rel="nofollow sponsored"`) is never accidentally dropped — see README's
  "法令・アフィリエイト表記について" section before removing that wrapper.
- Every public article must show a non-affiliate `公式サイトで探す` link before any affiliate
  links. Point it directly to a confirmed brand/store official URL when available; otherwise use
  the generated Google official-site search fallback. YouTube/social URLs are not direct official
  site candidates. Keep other confirmed links as additional rows; never guess a brand domain.
- Generated standard/YouTube article prose should target 2–3 explanatory paragraphs and roughly
  400–600 Japanese characters, excluding the item-information block. Preserve verified price,
  release date, retailer, model number, size, and material facts.
- Automatic publishing is mens/unisex-led. Across each four-hour six-article cycle, publish no more
  than one explicitly women-focused article. Detect women-focused items only from explicit wording
  such as ウィメンズ/レディース/Women's; never infer gender from a brand or visual impression.
- Mix up to two eligible YouTube articles into each four-hour six-article cycle. Do not force a
  video that fails normal publication requirements; fill the remaining slots with standard articles.
- Across each eight-hour twelve-article cycle, publish no more than one FASHIONSNAP-sourced article.
  Prefer other official/primary sources for the remaining slots; do not force a FASHIONSNAP article
  when no candidate passes the normal publication requirements.
- Public article pages always keep visible price/release/purchase information, but never emit
  `Product` or `Offer` JSON-LD, including BUY/PICKS. DROP DROP DROP is an editorial affiliate medium,
  not the seller, and Product+Offer causes Google to inspect article pages as merchant listings.
  Use Article + Breadcrumb structured data only. Never invent reviews, ratings, shipping, returns,
  availability, or seller data to silence Search Console warnings.
- SEO topic labels are derived by `lib/seo-topics.ts`. Add `ファッション`, `30代おしゃれ`, `40代おしゃれ`, or
  `メンズファッション` only when the article text/category satisfies that topic's rules. Never attach
  age/style keywords to every article or repeat them unnaturally in prose; use the topic landing pages and
  crawlable internal links instead.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
