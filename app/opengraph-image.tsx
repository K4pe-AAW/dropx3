import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"

export const alt = siteConfig.name
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 900,
            color: "#AFF03C",
            letterSpacing: -2,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: "flex",
            width: 220,
            height: 6,
            background: "#AFF03C",
            marginTop: 32,
            marginBottom: 32,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#999999",
            letterSpacing: 4,
          }}
        >
          SNEAKER & STREET FASHION NEWS
        </div>
      </div>
    ),
    { ...size }
  )
}
