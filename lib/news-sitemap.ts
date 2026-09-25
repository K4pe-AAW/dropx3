import type { Article } from "./types"

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!)
}

export function recentNewsArticles(articles: Article[], now = new Date()): Article[] {
  const cutoff = now.getTime() - 2 * 24 * 60 * 60 * 1000
  return articles
    .filter((article) => {
      const published = Date.parse(article.publishedAt)
      return Number.isFinite(published) && published >= cutoff && published <= now.getTime()
    })
    .slice(0, 1000)
}

export function renderNewsSitemap(articles: Article[], options: { siteUrl: string; publicationName: string }): string {
  const urls = articles.map((article) => {
    const url = new URL(`/articles/${article.slug}`, options.siteUrl).toString()
    return `<url><loc>${xml(url)}</loc><news:news><news:publication><news:name>${xml(options.publicationName)}</news:name><news:language>ja</news:language></news:publication><news:publication_date>${xml(article.publishedAt)}</news:publication_date><news:title>${xml(article.title)}</news:title></news:news></url>`
  }).join("")
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`
}
