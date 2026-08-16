"use client"

import { useState } from "react"
import type { CrawlLog, ImagePolicy, MonitoringMethod, Source } from "@/lib/source-watch/types"
import { SOURCE_CATEGORY_LABEL, SOURCE_CATEGORY_ORDER } from "@/lib/source-watch/labels"

type SourceWithLog = Source & { latestCrawlLog?: CrawlLog }

const METHODS: MonitoringMethod[] = ["rss", "sitemap", "html", "api", "manual"]
const IMAGE_POLICIES: ImagePolicy[] = ["press_assets_available", "affiliate_assets", "embed_only", "unknown", "do_not_use"]

const inputClass = "rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring bg-background"

function formatLog(log?: CrawlLog): string {
  if (!log) return "巡回履歴なし"
  const t = new Date(log.startedAt).toLocaleString("ja-JP")
  return `${t} / 新着${log.newCount}件 / 処理${log.changedCount}件 / エラー${log.errorCount}件 / robots:${log.robotsVerdict} / ${log.durationMs}ms`
}

export function SourceWatchSources({ initialSources }: { initialSources: SourceWithLog[] }) {
  const [sources, setSources] = useState(initialSources)
  const [crawlingAll, setCrawlingAll] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function crawlAll() {
    setCrawlingAll(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/source-watch/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage(`${data.results.length}件のソースを巡回しました。ページを再読み込みすると最新の記事候補が反映されます。`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "巡回に失敗しました")
    } finally {
      setCrawlingAll(false)
    }
  }

  function patchSource(id: string, patch: Partial<SourceWithLog>) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSourceFromList(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id))
  }

  function addSourceToList(source: Source) {
    setSources((prev) => [...prev, source])
  }

  const grouped = SOURCE_CATEGORY_ORDER.map((cat) => ({ cat, items: sources.filter((s) => s.category === cat) })).filter(
    (g) => g.items.length > 0
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={crawlAll}
          disabled={crawlingAll}
          className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {crawlingAll ? "巡回中..." : "巡回する(期限が来たものだけ)"}
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>

      <AddSourceForm onAdded={addSourceToList} />

      <div className="space-y-8 mt-8">
        {grouped.map(({ cat, items }) => (
          <div key={cat}>
            <h3 className="text-xs font-bold text-muted-foreground mb-2">
              {SOURCE_CATEGORY_LABEL[cat]} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((s) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  onChange={(patch) => patchSource(s.id, patch)}
                  onRemoved={() => removeSourceFromList(s.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type AddKind = "official" | "retailer" | "youtube"
const ADD_KIND_LABEL: Record<AddKind, string> = {
  official: "ブランド公式サイト",
  retailer: "セレクトショップ",
  youtube: "YouTubeチャンネル",
}
const ADD_KIND_PLACEHOLDER: Record<AddKind, string> = {
  official: "https://brand-official-site.com/",
  retailer: "https://select-shop.com/",
  youtube: "https://www.youtube.com/@ハンドル または /channel/UC…",
}

function AddSourceForm({ onAdded }: { onAdded: (source: Source) => void }) {
  const [kind, setKind] = useState<AddKind>("official")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function submit() {
    if (!name.trim() || !url.trim()) {
      setStatus("名前とURLを両方入力してください")
      return
    }
    setSubmitting(true)
    setStatus(null)
    try {
      const res = await fetch("/api/admin/source-watch/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: name.trim(), url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdded(data)
      setName("")
      setUrl("")
      setStatus(`「${data.name}」を追加しました`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "追加に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-dashed border-border rounded-lg p-3">
      <p className="text-xs font-bold mb-2">情報源を追加</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {(Object.keys(ADD_KIND_LABEL) as AddKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              kind === k
                ? "h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold"
                : "h-7 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary"
            }
          >
            {ADD_KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
        <input
          className={inputClass}
          placeholder="名前(例: BEAMS)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder={ADD_KIND_PLACEHOLDER[kind]}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="h-8 px-4 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? "追加中..." : "追加する"}
        </button>
      </div>
      {kind === "youtube" && (
        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
          チャンネルIDを自動取得してRSS巡回を有効にします(720分間隔)。取得できない場合はURLを見直してください。
        </p>
      )}
      {kind !== "youtube" && (
        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
          まず巡回方式「html」・画像利用ポリシー「unknown」で登録されます。RSS/SitemapのURLが分かれば下の一覧から編集できます。
        </p>
      )}
      {status && <p className="text-[11px] text-muted-foreground mt-1.5">{status}</p>}
    </div>
  )
}

function SourceRow({
  source,
  onChange,
  onRemoved,
}: {
  source: SourceWithLog
  onChange: (patch: Partial<SourceWithLog>) => void
  onRemoved: () => void
}) {
  const [url, setUrl] = useState(source.url ?? "")
  const [feedUrl, setFeedUrl] = useState(source.feedUrl ?? "")
  const [enabled, setEnabled] = useState(source.enabled)
  const [score, setScore] = useState(source.sourceScore)
  const [interval, setIntervalMin] = useState(source.monitoringIntervalMinutes)
  const [method, setMethod] = useState(source.monitoringMethod)
  const [imagePolicy, setImagePolicy] = useState(source.imagePolicy)
  const [saving, setSaving] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/source-watch/sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, feedUrl, enabled, sourceScore: score, monitoringIntervalMinutes: interval, monitoringMethod: method, imagePolicy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange(data)
      setStatus("保存しました")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`「${source.name}」を削除します。よろしいですか？`)) return
    setRemoving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/source-watch/sources/${source.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onRemoved()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "削除に失敗しました")
      setRemoving(false)
    }
  }

  async function crawlNow() {
    setCrawling(true)
    setStatus(null)
    try {
      const res = await fetch("/api/admin/source-watch/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const log = data.results?.[0]
      onChange({ latestCrawlLog: log })
      setStatus(log ? `新着${log.newCount}件 / エラー${log.errorCount}件` : "完了")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "巡回に失敗しました")
    } finally {
      setCrawling(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label className="flex items-center gap-1.5 text-sm font-bold">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {source.name}
        </label>
        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{method}</span>
        {!source.url && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">URL未確認</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <input className={inputClass} placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className={inputClass} placeholder="Feed URL(RSS/Sitemap)" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
        <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as MonitoringMethod)}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className={inputClass} value={imagePolicy} onChange={(e) => setImagePolicy(e.target.value as ImagePolicy)}>
          {IMAGE_POLICIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          信頼度
          <input
            type="number"
            min={0}
            max={100}
            className={`${inputClass} w-16`}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          巡回間隔(分)
          <input
            type="number"
            min={1}
            className={`${inputClass} w-16`}
            value={interval}
            onChange={(e) => setIntervalMin(Number(e.target.value))}
          />
        </label>
      </div>

      {source.notes && <p className="text-[11px] text-muted-foreground/70 mb-2 leading-relaxed">{source.notes}</p>}
      <p className="text-[10px] text-muted-foreground/60 mb-2">{formatLog(source.latestCrawlLog)}</p>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="h-7 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={crawlNow}
          disabled={crawling || method === "manual" || !url}
          className="h-7 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {crawling ? "巡回中..." : "今すぐ巡回"}
        </button>
        <button
          onClick={remove}
          disabled={removing}
          className="h-7 px-3 rounded-full border border-border text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {removing ? "削除中..." : "削除"}
        </button>
        {status && <span className="text-[11px] text-muted-foreground">{status}</span>}
      </div>
    </div>
  )
}
