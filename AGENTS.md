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
- `data/drafts.json` — AI-drafted candidates. Official, non-sponsored normal articles
  with verified official links and image provenance may auto-publish at up to 2/day;
  Goss!p/leaks, PR, SNAP, video, or unclear rights always stay for human review.
- Affiliate links must go through `lib/affiliate.ts` so disclosure (`PR` badge,
  `rel="nofollow sponsored"`) is never accidentally dropped — see README's
  "法令・アフィリエイト表記について" section before removing that wrapper.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
