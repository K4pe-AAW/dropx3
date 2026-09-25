import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { siteConfig } from "@/lib/site-config"
import { FluidBackground } from "@/components/FluidBackground"
import { Analytics } from "@/components/Analytics"
import { AdsenseAutoAds } from "@/components/AdsenseAutoAds"

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
  creator: `${siteConfig.name}編集部`,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
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
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <Analytics />
        <AdsenseAutoAds />
        <FluidBackground />
        {children}
      </body>
    </html>
  )
}
