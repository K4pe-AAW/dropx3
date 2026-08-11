import OpenAI from "openai"

let client: OpenAI | null = null

/** ai-draft.ts / source-watch/extract.ts / source-watch/draft-builder.ts で共有するOpenAIクライアント */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set")
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}
