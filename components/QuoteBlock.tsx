export function QuoteBlock({ text, sourceLabel }: { text: string; sourceLabel: string }) {
  return (
    <div className="border-l-4 border-accent bg-muted/60 rounded-r-lg px-5 py-4 my-6">
      <span className="text-xs font-bold text-accent-foreground bg-accent rounded-full px-2.5 py-0.5">プロフィール</span>
      <p className="mt-3 text-sm leading-[1.9] whitespace-pre-line text-muted-foreground">{text}</p>
      <p className="mt-2 text-xs text-muted-foreground/70">情報源: {sourceLabel}</p>
    </div>
  )
}
