import type { MetadataRoute } from "next"
import { getAllArticles, getAllBrands } from "@/lib/storage"
import { siteConfig } from "@/lib/site-config"

// Article and brand data live in Vercel Blob. Resolve them at request time so
// local/CI builds never require a production Blob credential.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles()
  const brands = await getAllBrands()

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "hourly", priority: 1 },
    { url: `${siteConfig.url}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/disclaimer`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/column`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/picks`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/snap`, changeFrequency: "weekly", priority: 0.8 },
    ...siteConfig.categories.map((c) => ({
      url: `${siteConfig.url}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ]

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${siteConfig.url}/articles/${a.slug}`,
    lastModified: a.updatedAt ?? a.publishedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${siteConfig.url}/brand/${encodeURIComponent(b.name)}`,
    changeFrequency: "weekly",
    priority: 0.4,
  }))

  return [...staticPages, ...articlePages, ...brandPages]
}
