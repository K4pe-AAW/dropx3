import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#0a0a0a",
          color: "#AFF03C",
          border: "8px solid #AFF03C",
          borderRadius: 38,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", fontWeight: 900 }}>
          <span style={{ fontSize: 112, lineHeight: 1, letterSpacing: -10 }}>D</span>
          <span style={{ fontSize: 38, lineHeight: 1, marginTop: 18, marginLeft: 4 }}>×3</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
