export {}

const secret = process.env.CRON_SECRET

if (!secret || secret === "[SENSITIVE]") {
  throw new Error("ProductionのCRON_SECRETを安全に読み込めませんでした")
}

const response = await fetch("https://dropx3.com/api/cron/migrate-gossp", {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
})
const body = await response.json() as Record<string, unknown>
if (!response.ok) throw new Error(`Gossp!変換APIがHTTP ${response.status}を返しました`)
console.log(JSON.stringify(body))
