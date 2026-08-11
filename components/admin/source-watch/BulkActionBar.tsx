export function BulkActionBar({
  count,
  busy,
  onIgnore,
  onHold,
  onUnhold,
  onClear,
}: {
  count: number
  busy: boolean
  onIgnore: () => void
  onHold: () => void
  onUnhold: () => void
  onClear: () => void
}) {
  if (count === 0) return null
  return (
    <div className="sticky top-2 z-20 mb-3 flex items-center justify-between gap-3 rounded-xl border border-foreground bg-foreground px-4 py-2.5 text-background shadow-lg">
      <span className="text-xs font-bold">{count}件選択中</span>
      <div className="flex items-center gap-2">
        <button onClick={onHold} disabled={busy} className="h-7 rounded-full bg-background/10 px-3 text-[11px] font-semibold hover:bg-background/20 disabled:opacity-50">
          保留
        </button>
        <button onClick={onUnhold} disabled={busy} className="h-7 rounded-full bg-background/10 px-3 text-[11px] font-semibold hover:bg-background/20 disabled:opacity-50">
          保留解除
        </button>
        <button onClick={onIgnore} disabled={busy} className="h-7 rounded-full bg-background/10 px-3 text-[11px] font-semibold hover:bg-background/20 disabled:opacity-50">
          無視
        </button>
        <button onClick={onClear} className="h-7 px-2 text-[11px] text-background/70 hover:text-background">
          選択解除
        </button>
      </div>
    </div>
  )
}
