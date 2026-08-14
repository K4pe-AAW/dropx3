/**
 * AdSense等のads.txt。パブリッシャーIDが正しく宣言されていないと広告収益が制限される
 * (「未承認の販売者」警告)ため、NEXT_PUBLIC_ADSENSE_CLIENT_ID設定時のみ生成する。
 * 値は"ca-pub-xxxx"(スクリプトのclientパラメータと同じ形式)で保持し、ads.txt向けに
 * "pub-xxxx"へ変換する。
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  if (!clientId) {
    return new Response("", { headers: { "Content-Type": "text/plain" } })
  }
  const pubId = clientId.replace(/^ca-/, "")
  return new Response(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain" },
  })
}
