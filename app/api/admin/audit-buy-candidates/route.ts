import { NextResponse } from "next/server"
import { getArticleById } from "@/lib/storage"

export async function GET() {
  const article = await getArticleById("b0b2b7c15bb5f184407fa59bcf9df2e3")
  return NextResponse.json({ article })
}
