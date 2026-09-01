import Link from "next/link"
import type { SnapProfile } from "@/lib/types"

export function SnapProfileCard({ profile }: { profile: SnapProfile }) {
  const meta = [profile.ageGroup, profile.occupation, profile.location].filter(Boolean)
  return (
    <section className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-6">
      <p className="text-[10px] font-black tracking-[0.22em] text-accent">EDITORIAL SNAP</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-black">{profile.displayName}</h2>
        {meta.length > 0 && <p className="text-xs text-muted-foreground">{meta.join(" / ")}</p>}
      </div>
      <div className="mt-5">
        <h3 className="text-xs font-black">今日のポイント</h3>
        <p className="mt-1 text-sm leading-relaxed">{profile.stylePoint}</p>
      </div>
      {profile.items.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-black">着用アイテム</h3>
          <dl className="divide-y divide-border border-y border-border">
            {profile.items.map((item, index) => (
              <div key={`${item.brand}-${item.itemName}-${index}`} className="grid grid-cols-[90px_1fr] gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">{item.category || "ITEM"}</dt>
                <dd>{item.brand ? <Link className="font-bold underline decoration-1 underline-offset-2" href={`/brand/${encodeURIComponent(item.brand)}`}>{item.brand}</Link> : "—"}{item.itemName && `${item.brand ? " / " : ""}${item.itemName}`}{item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {profile.instagramUrl && <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-xs font-bold underline underline-offset-4">Instagramを見る</a>}
    </section>
  )
}
