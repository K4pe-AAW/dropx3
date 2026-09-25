import { getAllArticles } from "@/lib/storage"
import { recentNewsArticles, renderNewsSitemap } from "@/lib/news-sitemap"
import { siteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

export async function GET() {
  const articles = recentNewsArticles(await getAllArticles())
  return new Response(renderNewsSitemap(articles, { siteUrl: siteConfig.url, publicationName: siteConfig.name }), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=600",
    },
  })
}
