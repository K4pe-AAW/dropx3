import type { Category } from "./types"

/**
 * サイトのブランド設定を1箇所に集約。名前やタグラインを変える場合はここだけ編集すればよい。
 */
export const siteConfig = {
  name: "DROP DROP DROP",
  tagline: "スニーカー & ストリートファッションの最新情報を毎日配信。",
  description:
    "DROP DROP DROPは、スニーカーとストリートファッションの発売・再販・コラボ情報を毎日更新するニュースメディアです。",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://dropdropdrop.example.com",
  operatorName: "DROP DROP DROP運営部", // 特定商取引法/プライバシーポリシー表記用。実運用前に要編集
  /** 未設定時にexample.comのような偽アドレスを表示しないよう、環境変数がなければnullにする */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  categories: [
    { slug: "tops" as Category, label: "トップス" },
    { slug: "pants" as Category, label: "パンツ" },
    { slug: "jacket" as Category, label: "ジャケット" },
    { slug: "boots" as Category, label: "ブーツ" },
    { slug: "sneaker" as Category, label: "スニーカー" },
    { slug: "accessory" as Category, label: "アクセサリー" },
    { slug: "figure" as Category, label: "フィギュア" },
    { slug: "vintage" as Category, label: "古着" },
    { slug: "youtube" as Category, label: "Youtube" },
  ],
}

export function categoryLabel(category: Category): string {
  return siteConfig.categories.find((c) => c.slug === category)?.label ?? category
}
