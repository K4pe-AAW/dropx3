import Link from "next/link"
import type { Metadata } from "next"
import { getPendingDrafts, getAllArticles } from "@/lib/storage"
import { CollectButton } from "@/components/admin/CollectButton"
import { DeleteAllDraftsButton } from "@/components/admin/DeleteAllDraftsButton"
import { LogoutButton } from "@/components/admin/LogoutButton"
import { ArticleSearch } from "@/components/admin/ArticleSearch"
import { categoryLabel } from "@/lib/site-config"

export const metadata: Metadata = { title: "管理画面" }

/** 運用ガイド(Artifact)。同じfile_pathで再公開すればURLは変わらない */
const ADMIN_GUIDE_URL = "https://claude.ai/code/artifact/643aaaf7-ac93-4cc5-8924-29896976591c"

export default async function AdminPage() {
  const [drafts, articles] = await Promise.all([getPendingDrafts(), getAllArticles()])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">管理画面</h1>
        <div className="flex items-center gap-3">
          <a
            href={ADMIN_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            使い方ガイド
          </a>
          <Link href="/admin/source-watch" className="text-xs font-semibold text-accent-foreground hover:underline">
            SOURCE WATCH
          </Link>
          <Link href="/admin/vintage-shop" className="text-xs font-semibold text-accent-foreground hover:underline">
            古着屋投稿
          </Link>
          <LogoutButton />
        </div>
      </div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-muted-foreground">レビュー待ちの下書き: {drafts.length}件</p>
        <div className="flex items-center gap-2">
          <DeleteAllDraftsButton count={drafts.length} />
          <CollectButton />
        </div>
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

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-sm font-bold mb-3">公開済み記事を編集</h2>
        <ArticleSearch articles={articles.map((a) => ({ id: a.id, slug: a.slug, title: a.title }))} />
      </div>
    </div>
  )
}
