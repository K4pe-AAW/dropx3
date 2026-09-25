import { getAllArticles } from "@/lib/storage"
import { siteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!)
}

export async function GET() {
  const articles = (await getAllArticles()).slice(0, 50)
  const items = articles.map((article) => {
    const url = new URL(`/articles/${article.slug}`, siteConfig.url).toString()
    return `<item><title>${xml(article.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><description>${xml(article.excerpt)}</description></item>`
  }).join("")
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(siteConfig.name)}</title><link>${xml(siteConfig.url)}</link><description>${xml(siteConfig.description)}</description><language>ja</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } })
}
