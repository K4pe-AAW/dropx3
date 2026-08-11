"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { computeSocialSummary, sortSocialCardsByPriority } from "@/lib/source-watch/social-present"
import type { Source } from "@/lib/source-watch/types"
import { SourceInspector } from "../SourceInspector"
import type { FocusTarget } from "../missing-actions"
import { SocialSummaryBar } from "./SocialSummaryBar"
import { AnalyzeUrlBar } from "./AnalyzeUrlBar"
import { FollowingSources } from "./FollowingSources"
import { SocialPostCard } from "./SocialPostCard"
import { applySocialQuickFilter, type SocialQuickFilter } from "./filters"

export function SocialWatchDashboard({ initialCards, initialSources }: { initialCards: ProductCardData[]; initialSources: Source[] }) {
  const [cards, setCards] = useState(initialCards)
  const [sources, setSources] = useState(initialSources)
  const [quickFilter, setQuickFilter] = useState<SocialQuickFilter | "all">("all")
  const [inspector, setInspector] = useState<{ id: string; focus?: FocusTarget } | null>(null)

  const sourceByName = useMemo(() => new Map(sources.map((s) => [s.name, s])), [sources])
  const sorted = useMemo(() => sortSocialCardsByPriority(cards), [cards])
  const filtered = useMemo(() => applySocialQuickFilter(sorted, quickFilter), [sorted, quickFilter])
  const summary = useMemo(() => computeSocialSummary(cards), [cards])

  const newCountBySourceId = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of sources) {
      counts[s.id] = cards.filter((c) => c.product.reviewStatus === "pending" && c.sourceNames.includes(s.name)).length
    }
    return counts
  }, [sources, cards])

  function openInspector(id: string, focus?: FocusTarget) {
    setInspector({ id, focus })
  }
  function closeInspector() {
    setInspector(null)
  }
  function patchCard(updated: ProductCardData) {
    setCards((prev) => (prev.some((c) => c.product.id === updated.product.id) ? prev.map((c) => (c.product.id === updated.product.id ? updated : c)) : [updated, ...prev]))
  }
  function removeCard(productId: string) {
    setCards((prev) => prev.filter((c) => c.product.id !== productId))
    setInspector((prev) => (prev?.id === productId ? null : prev))
  }

  const inspectorCard = inspector ? (cards.find((c) => c.product.id === inspector.id) ?? null) : null
  const enabledSocialSources = sources.filter((s) => s.enabled)

  return (
    <div>
      <SocialSummaryBar stats={summary} onSelect={setQuickFilter} />
      <AnalyzeUrlBar sources={enabledSocialSources} onAnalyzed={patchCard} />

      <div className={cn("lg:grid lg:items-start lg:gap-5", inspectorCard ? "lg:grid-cols-[220px_1fr_380px]" : "lg:grid-cols-[220px_1fr]")}>
        <div className="mb-5 lg:mb-0">
          <FollowingSources sources={sources} newCountBySourceId={newCountBySourceId} onSourcesChanged={setSources} />
        </div>

        <div>
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {cards.length === 0 ? "まだ投稿がありません。上のバーからInstagram投稿URLを解析してください。" : "条件に合う投稿はありません。"}
            </p>
          ) : (
            <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", inspectorCard ? "" : "xl:grid-cols-3")}>
              {filtered.map((c) => (
                <SocialPostCard key={c.product.id} card={c} sourceSocialType={sourceByName.get(c.sourceNames[0] ?? "")?.socialType} onOpen={openInspector} />
              ))}
            </div>
          )}
        </div>

        {inspectorCard && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-background lg:sticky lg:top-4 lg:z-auto lg:max-h-[calc(100vh-2rem)] lg:rounded-xl lg:border lg:border-border lg:bg-card">
            <SourceInspector
              key={`${inspectorCard.product.id}:${inspector?.focus ?? ""}`}
              card={inspectorCard}
              focus={inspector?.focus}
              onClose={closeInspector}
              onCardUpdated={patchCard}
              onRemoved={removeCard}
            />
          </div>
        )}
      </div>
    </div>
  )
}
