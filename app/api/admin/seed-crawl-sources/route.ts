import { NextResponse } from "next/server"
import { mutateCrawlSources, generateId } from "@/lib/storage"
import { YoutubeCrawlSource, BrandCrawlSource } from "@/lib/types"

/**
 * 一時admin API。lib/sources.tsのハードコード配列(YOUTUBE_SOURCES/DIRECT_BRAND_SOURCES)を
 * Blob(data/crawl-sources.json)へ初回投入する。管理画面(/admin/crawl-sources)からの
 * 追加・削除に移行するための1回限りの移行作業。使用後に削除すること。
 */
const YOUTUBE_SEED: { name: string; channelId: string; siteUrl: string }[] = [
  { name: "石川俊介", channelId: "UCOxDy_5spY9R7MzY5tyuIHg", siteUrl: "https://www.youtube.com/@Shunsuke_Ishikawa" },
  { name: "nakamu_nakamu", channelId: "UCVxR92R3kl7pr0CYY0podOA", siteUrl: "https://www.youtube.com/@nakamu_nakamu" },
  { name: "Takahiro Kawashima", channelId: "UCagYXYqBUVIdE7gKc6bcuSA", siteUrl: "https://www.youtube.com/@takahiro_kawashima" },
  { name: "YUYA OFUJI CHANNEL", channelId: "UCcR5p5UTpIF9I5AqqZOW-Og", siteUrl: "https://www.youtube.com/@YUYAOFUJICHANNEL" },
  { name: "Lou vintage mix", channelId: "UCLA_y3n1leleGr4UBnEHvUA", siteUrl: "https://www.youtube.com/@lou_vintage_mix_dayoff" },
]

const BRAND_SEED: { name: string; url: string; instagramUrl?: string }[] = [
  { name: "AURALEE", url: "https://auralee.jp/" },
  { name: "MARKAWARE", url: "https://markaware.jp/" },
  { name: "ssstein", url: "https://ssstein.com/" },
  { name: "NICENESS", url: "https://www.niceness.jp/", instagramUrl: "https://www.instagram.com/niceness_official/" },
  { name: "KAPTAIN SUNSHINE", url: "https://kaptainsunshine.com/", instagramUrl: "https://www.instagram.com/kaptainsunshine/" },
  { name: "CLESSTE", url: "https://clesste.com/", instagramUrl: "https://www.instagram.com/the_clesste/" },
  { name: "ENNOY", url: "https://www.ennoy.pro/", instagramUrl: "https://www.instagram.com/ennoy_com/" },
  { name: "COVERCHORD", url: "https://coverchord.com/" },
  { name: "1LDK", url: "https://onlinestore.1ldkshop.com/" },
  { name: "ARKnets", url: "https://www.arknets.co.jp/" },
  { name: "Graphpaper", url: "https://graphpaper-store.com/" },
  { name: "Guidi", url: "https://guidi.it/" },
  { name: "Paraboot", url: "https://paraboot.shop/" },
  { name: "Danner", url: "https://jp.danner.com/" },
  { name: "Timberland", url: "https://www.timberland.co.jp/" },
  { name: "Nike", url: "https://www.nike.com/jp/launch" },
  { name: "New Balance", url: "https://shop.newbalance.jp/" },
  { name: "HOKA", url: "https://www.hoka.com/jp/" },
  { name: "Salomon", url: "https://salomon.jp/" },
  { name: "Converse", url: "https://converse.co.jp/" },
  { name: "Vans", url: "https://www.vans.co.jp/" },
  { name: "adidas", url: "https://www.adidas.jp/" },
  { name: "MEDICOM TOY", url: "https://www.medicomtoy.co.jp/" },
  { name: "GRAPE BRAIN", url: "https://www.instagram.com/grapebrain_rage/" },
  { name: "gyaromi", url: "https://www.instagram.com/gyaromi/" },
  { name: "INSTINCTOY", url: "https://www.instagram.com/instinctoy_official/" },
  { name: "emDASH", url: "https://www.instagram.com/emdash_toy/" },
  { name: "T9G", url: "https://www.instagram.com/xt9gx/" },
  { name: "創作ソフビ決起集会(大まん祭)", url: "https://www.instagram.com/mdk.sofvi.fes/" },
]

export async function POST() {
  const result = await mutateCrawlSources((data) => {
    const existingYoutubeIds = new Set(data.youtube.map((y) => y.channelId))
    const newYoutube: YoutubeCrawlSource[] = YOUTUBE_SEED.filter((s) => !existingYoutubeIds.has(s.channelId)).map((s) => ({
      id: generateId(`youtube-${s.channelId}`),
      ...s,
      createdAt: new Date().toISOString(),
    }))

    const existingBrandUrls = new Set(data.brands.map((b) => b.url))
    const newBrands: BrandCrawlSource[] = BRAND_SEED.filter((s) => !existingBrandUrls.has(s.url)).map((s) => ({
      id: generateId(`brand-${s.url}`),
      ...s,
      createdAt: new Date().toISOString(),
    }))

    return {
      youtube: [...data.youtube, ...newYoutube],
      brands: [...data.brands, ...newBrands],
    }
  })

  return NextResponse.json({ youtubeCount: result.youtube.length, brandsCount: result.brands.length })
}
