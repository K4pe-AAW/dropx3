import Link from "next/link"
import type { Metadata } from "next"
import { getPendingDrafts } from "@/lib/storage"
import { CollectButton } from "@/components/admin/CollectButton"
import { LogoutButton } from "@/components/admin/LogoutButton"
import { categoryLabel } from "@/lib/site-config"

export const metadata: Metadata = { title: "管理画面" }

export default async function AdminPage() {
  const drafts = getPendingDrafts()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">管理画面</h1>
        <LogoutButton />
      </div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-muted-foreground">レビュー待ちの下書き: {drafts.length}件</p>
        <CollectButton />
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          下書きはありません。上の「収集を実行」を押すか、ターミナルで
          <code className="text-xs bg-secondary px-1.5 py-0.5 rounded mx-1">npm run collect</code>
          を実行してください。
        </p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li key={d.id} className="border border-border rounded-xl p-4">
              <Link href={`/admin/drafts/${d.id}`} className="font-bold text-sm hover:underline">
                {d.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">{d.excerpt}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                {categoryLabel(d.category)} ・{" "}
                {d.brands.join(", ") || "ブランドなし"} ・ 出典: {d.sourceRefs.map((r) => r.name).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
