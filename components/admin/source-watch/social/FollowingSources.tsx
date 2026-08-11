"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/source-watch/countdown"
import { SOCIAL_PRIORITY_ORDER, SOCIAL_SOURCE_TYPE_LABEL, SOCIAL_TOPIC_LABEL, SOCIAL_TOPICS, type SocialTopic } from "@/lib/source-watch/labels"
import type { SocialPriority, SocialSourceType, Source } from "@/lib/source-watch/types"

const SOCIAL_SOURCE_TYPES: SocialSourceType[] = ["official_brand", "official_artist", "official_event", "official_store", "media", "collector", "unknown"]

function SourceRow({ source, newCount, onUpdated }: { source: Source; newCount: number; onUpdated: (s: Source) => void }) {
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/source-watch/sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) onUpdated(data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1 rounded-lg px-1.5 py-1.5 hover:bg-secondary/60">
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-w-0 items-center gap-2">
          <input type="checkbox" checked={source.enabled} disabled={busy} onChange={(e) => patch({ enabled: e.target.checked })} className="accent-foreground" />
          <span className={cn("truncate text-[12px] font-semibold", !source.enabled && "text-muted-foreground line-through")}>{source.name}</span>
        </label>
        {newCount > 0 && <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{newCount}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 pl-6 text-[10px] text-muted-foreground">
        <select
          value={source.priority ?? "B"}
          disabled={busy}
          onChange={(e) => patch({ priority: e.target.value })}
          className="rounded border border-border bg-background px-1 py-0.5 text-[10px]"
        >
          {SOCIAL_PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              優先度 {p}
            </option>
          ))}
        </select>
        <span>{source.lastCheckedAt ? formatRelativeTime(source.lastCheckedAt) : "未確認"}</span>
      </div>
    </div>
  )
}

function AddSourceForm({ onAdded }: { onAdded: (s: Source) => void }) {
  const [open, setOpen] = useState(false)
  const [profileUrl, setProfileUrl] = useState("")
  const [name, setName] = useState("")
  const [socialType, setSocialType] = useState<SocialSourceType>("unknown")
  const [priority, setPriority] = useState<SocialPriority>("B")
  const [topics, setTopics] = useState<SocialTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTopic(t: SocialTopic) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  async function submit() {
    if (!profileUrl.trim() || !name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/source-watch/social/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileUrl.trim(), name: name.trim(), socialType, priority, topics }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdded(data)
      setProfileUrl("")
      setName("")
      setSocialType("unknown")
      setPriority("B")
      setTopics([])
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-lg border border-dashed border-border py-2 text-[11px] font-semibold text-muted-foreground hover:border-foreground hover:text-foreground">
        + Instagramアカウントを追加
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <input
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring"
        placeholder="https://www.instagram.com/handle/"
        value={profileUrl}
        onChange={(e) => setProfileUrl(e.target.value)}
      />
      <input
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring"
        placeholder="表示名(例: GRAPE BRAIN)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <select value={socialType} onChange={(e) => setSocialType(e.target.value as SocialSourceType)} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
          {SOCIAL_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOCIAL_SOURCE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as SocialPriority)} className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
          {SOCIAL_PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              優先度 {p}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SOCIAL_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleTopic(t)}
            className={cn(
              "h-6 rounded-full border px-2 text-[10px] font-semibold",
              topics.includes(t) ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
            )}
          >
            {SOCIAL_TOPIC_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={loading || !profileUrl.trim() || !name.trim()} className="h-7 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "追加中..." : "監視開始"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
          キャンセル
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

export function FollowingSources({
  sources,
  newCountBySourceId,
  onSourcesChanged,
}: {
  sources: Source[]
  newCountBySourceId: Record<string, number>
  onSourcesChanged: (sources: Source[]) => void
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Source[]>()
    for (const s of sources) {
      const topics = s.topics && s.topics.length > 0 ? s.topics : ["その他"]
      for (const t of topics) {
        if (!groups.has(t)) groups.set(t, [])
        groups.get(t)!.push(s)
      }
    }
    return [...groups.entries()]
  }, [sources])

  function replaceSource(updated: Source) {
    onSourcesChanged(sources.map((s) => (s.id === updated.id ? updated : s)))
  }
  function addSource(created: Source) {
    onSourcesChanged([...sources, created])
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground/70">FOLLOWING SOURCES</h2>
        <div className="space-y-4">
          {grouped.map(([topic, items]) => (
            <div key={topic}>
              <p className="mb-1 text-[10px] font-bold tracking-wide text-muted-foreground">{SOCIAL_TOPIC_LABEL[topic as SocialTopic] ?? topic}</p>
              <div className="space-y-0.5">
                {items.map((s) => (
                  <SourceRow key={s.id} source={s} newCount={newCountBySourceId[s.id] ?? 0} onUpdated={replaceSource} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <AddSourceForm onAdded={addSource} />
    </div>
  )
}
