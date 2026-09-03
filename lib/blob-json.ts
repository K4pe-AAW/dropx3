import { get } from "@vercel/blob"

type BlobJsonResult =
  | null
  | {
      statusCode: number
      stream: ReadableStream<Uint8Array> | null
      blob: { etag: string }
    }

type BlobJsonGetter = (
  pathname: string,
  options: { access: "public"; useCache: false }
) => Promise<BlobJsonResult>

/**
 * JSON Blobの本文と同じ応答のETagを返す。head()の最新ETagとCDNの古い本文を別々に
 * 取得すると、ifMatchが成功したまま古い本文で上書きできてしまうため、read-modify-writeでは
 * 必ず本文とETagを同じ応答から取得する。GETのETagはW/付きの弱い形式で返るため、
 * Blob APIのifMatchが受け付ける強い形式へ正規化する。
 */
export async function readBlobJsonWithEtag<T>(
  pathname: string,
  getter: BlobJsonGetter = get as BlobJsonGetter
): Promise<{ data: T; etag: string } | null> {
  const result = await getter(pathname, { access: "public", useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null

  const data = (await new Response(result.stream).json()) as T
  return { data, etag: result.blob.etag.replace(/^W\//, "") }
}
