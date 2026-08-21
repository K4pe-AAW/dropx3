import Link from "next/link"
import type { Metadata } from "next"
import { getPendingDrafts, getAllArticles, getScheduledArticles, getCrawlSources } from "@/lib/storage"
import { CollectButton } from "@/components/admin/CollectButton"
import { DeleteAllDraftsButton } from "@/components/admin/DeleteAllDraftsButton"
import { LogoutButton } from "@/components/admin/LogoutButton"
import { ArticleSearch } from "@/components/admin/ArticleSearch"
import { DraftSearch } from "@/components/admin/DraftSearch"
import { ArticlesList } from "@/components/admin/ArticlesList"
import { DraftsList } from "@/components/admin/DraftsList"
import { ScheduledList } from "@/components/admin/ScheduledList"
import { Pagination } from "@/components/Pagination"
import { UrlDraftForm } from "@/components/admin/UrlDraftForm"
import { YoutubeSection } from "@/components/admin/CrawlSourcesManager"
import { DRAFT_GROUPS, draftGroupOf, type DraftGroupKey } from "@/lib/admin-draft-groups"

export const metadata: Metadata = { title: "管理画面" }

/** 運用ガイド(Artifact)。同じfile_pathで再公開すればURLは変わらない */
const ADMIN_GUIDE_URL = "https://claude.ai/code/artifact/643aaaf7-ac93-4cc5-8924-29896976591c"

const PAGE_SIZE = 15

type ViewKey = "drafts" | "published"
type SortKey = "newest" | "oldest"

/** 下書きの分類タブ(DraftGroupKey)とは別枠の、URL即時生成フォームを開くための擬似タブ */
const URL_GENERATE_TAB = "url-generate" as const

/** 元ネタ(出典)の投稿日を並べ替えキーにする。無い古いデータはcreatedAt(収集日)で代替する */
function sourceDateOf(d: { sourcePublishedAt?: string; createdAt: string }): string {
  return d.sourcePublishedAt ?? d.createdAt
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; view?: string; sort?: string }>
}) {
  const { page, tab, view, sort } = await searchParams
  const [drafts, articles, scheduled, crawlSources] = await Promise.all([
    getPendingDrafts(),
    getAllArticles(),
    getScheduledArticles(),
    getCrawlSources(),
  ])

  const activeView: ViewKey = view === "published" ? "published" : "drafts"
  const activeSort: SortKey = sort === "oldest" ? "oldest" : "newest"

  const activeTab: DraftGroupKey | typeof URL_GENERATE_TAB =
    tab === URL_GENERATE_TAB ? URL_GENERATE_TAB : DRAFT_GROUPS.some((g) => g.key === tab) ? (tab as DraftGroupKey) : DRAFT_GROUPS[0].key
  const isUrlGenerateTab = activeTab === URL_GENERATE_TAB
  const tabDrafts = (isUrlGenerateTab ? [] : drafts.filter((d) => draftGroupOf(d.category) === activeTab)).sort((a, b) => {
    const cmp = sourceDateOf(a).localeCompare(sourceDateOf(b))
    return activeSort === "newest" ? -cmp : cmp
  })

  const activeList = activeView === "drafts" ? tabDrafts : articles
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const pageDrafts = tabDrafts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageArticles = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
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
          <LogoutButton />
          <Link href="/admin/source-watch" className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
            SOURCE WATCH
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-8 overflow-x-auto">
        <Link
          href="/admin?view=drafts"
          className={
            activeView === "drafts"
              ? "px-4 py-3 text-sm font-black border-b-2 border-accent -mb-px whitespace-nowrap"
              : "px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground whitespace-nowrap"
          }
        >
          下書き ({drafts.length})
        </Link>
        <Link
          href="/admin?view=published"
          className={
            activeView === "published"
              ? "px-4 py-3 text-sm font-black border-b-2 border-accent -mb-px whitespace-nowrap"
              : "px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground whitespace-nowrap"
          }
        >
          公開済み ({articles.length})
        </Link>
        <Link href="/admin/vintage-shop" className="px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground whitespace-nowrap">
          古着屋投稿
        </Link>
        <Link href="/admin/crawl-sources" className="px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground whitespace-nowrap">
          収集元の管理
        </Link>
      </div>

      {activeView === "drafts" ? (
        <>
          <div className="flex items-center justify-end gap-2 mb-6">
            <DeleteAllDraftsButton count={drafts.length} />
            <CollectButton />
          </div>

          <ScheduledList scheduled={scheduled} />

          {drafts.length > 0 && (
            <DraftSearch drafts={drafts.map((d) => ({ id: d.id, title: d.title, brands: d.brands }))} />
          )}

          {drafts.length === 0 && !isUrlGenerateTab ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              下書きはありません。上の「収集を実行」を押すか、ターミナルで
              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded mx-1">npm run collect</code>
              を実行してください。
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {DRAFT_GROUPS.map((g) => {
                  const count = drafts.filter((d) => draftGroupOf(d.category) === g.key).length
                  const active = g.key === activeTab
                  return (
                    <Link
                      key={g.key}
                      href={`/admin?view=drafts&tab=${g.key}`}
                      className={
                        active
                          ? "h-9 flex items-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
                          : "h-9 flex items-center rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary"
                      }
                    >
                      {g.label} ({count})
                    </Link>
                  )
                })}
                <Link
                  href={`/admin?view=drafts&tab=${URL_GENERATE_TAB}`}
                  className={
                    isUrlGenerateTab
                      ? "h-9 flex items-center rounded-full bg-accent px-4 text-xs font-bold text-accent-foreground"
                      : "h-9 flex items-center rounded-full border border-dashed border-border px-4 text-xs font-semibold hover:bg-secondary"
                  }
                >
                  + URL生成 / Youtube追加
                </Link>
              </div>

              {!isUrlGenerateTab && (
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="text-xs text-muted-foreground mr-1">元ネタ:</span>
                  <Link
                    href={`/admin?view=drafts&tab=${activeTab}&sort=newest`}
                    className={
                      activeSort === "newest"
                        ? "h-7 flex items-center rounded-full bg-foreground px-3 text-[11px] font-bold text-background"
                        : "h-7 flex items-center rounded-full border border-border px-3 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                    }
                  >
                    新しい順
                  </Link>
                  <Link
                    href={`/admin?view=drafts&tab=${activeTab}&sort=oldest`}
                    className={
                      activeSort === "oldest"
                        ? "h-7 flex items-center rounded-full bg-foreground px-3 text-[11px] font-bold text-background"
                        : "h-7 flex items-center rounded-full border border-border px-3 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                    }
                  >
                    古い順
                  </Link>
                </div>
              )}

              {isUrlGenerateTab ? (
                <div className="space-y-12">
                  <UrlDraftForm />
                  <YoutubeSection youtube={crawlSources.youtube} />
                </div>
              ) : tabDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">このタブに下書きはありません。</p>
              ) : (
                <>
                  <DraftsList drafts={pageDrafts} />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    basePath="/admin"
                    extraParams={{ view: "drafts", tab: activeTab, sort: activeSort }}
                  />
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-8">
            <ArticleSearch articles={articles.map((a) => ({ id: a.id, slug: a.slug, title: a.title }))} />
          </div>

          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">公開済みの記事はありません。</p>
          ) : (
            <>
              <ArticlesList articles={pageArticles} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/admin"
                extraParams={{ view: "published" }}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
