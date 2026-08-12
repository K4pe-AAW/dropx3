import Link from "next/link"
import type { Metadata } from "next"
import { VintageShopPublisher } from "@/components/admin/VintageShopPublisher"

export const metadata: Metadata = { title: "古着屋 手動投稿" }

export default function VintageShopPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
        ← 管理画面
      </Link>
      <h1 className="text-xl font-black mt-2 mb-2">古着屋 手動投稿(tonari / ROOM)</h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        自動化ルーティンはこのアプリの実行環境からInstagramへ接続できないため(ネットワーク制限、恒久的)、
        1日2回のリマインダー通知を見たらこの画面から手動で投稿してください。所要時間は1件あたり1〜2分程度です。
      </p>
      <VintageShopPublisher />
    </div>
  )
}
