import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { AdSlot } from "@/components/AdSlot"

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Header />
      <main className="flex-1 relative z-10 w-full max-w-[1200px] mx-auto bg-background">{children}</main>
      <AdSlot />
      <Footer />
    </>
  )
}
