import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { siteConfig } from "@/lib/site-config"
import { FluidBackground } from "@/components/FluidBackground"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <FluidBackground />
        {children}
      </body>
    </html>
  )
}
