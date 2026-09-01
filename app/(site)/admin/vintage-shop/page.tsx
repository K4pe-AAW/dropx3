import { redirect } from "next/navigation"

export default function VintageShopPage() {
  redirect("/admin?view=drafts&tab=vintage")
}
