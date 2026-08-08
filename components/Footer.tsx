import Link from "next/link"
import { siteConfig } from "@/lib/site-config"

export function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-primary-foreground/15 bg-primary bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.7), rgba(0,0,0,.7)), url(/images/hero-bg.jpg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-primary-foreground/70">
        <p className="mb-4 leading-relaxed max-w-3xl">
          {siteConfig.name}は、Amazonアソシエイト・楽天アフィリエイト・A8.net・バリューコマース等のアフィリエイトプログラムを利用して収益を得ています。
          記事内のリンクから商品を購入・申込された場合、{siteConfig.name}に紹介料が支払われることがあります。詳しくは
          <Link href="/disclaimer" className="underline underline-offset-2 hover:text-primary-foreground">
            アフィリエイト表記・免責事項
          </Link>
          をご覧ください。
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
          <Link href="/about" className="hover:text-primary-foreground transition-colors">
            サイトについて
          </Link>
          <Link href="/privacy" className="hover:text-primary-foreground transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/disclaimer" className="hover:text-primary-foreground transition-colors">
            アフィリエイト表記・免責事項
          </Link>
          <Link href="/search" className="hover:text-primary-foreground transition-colors">
            記事を探す
          </Link>
        </nav>
        <p className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  )
}
