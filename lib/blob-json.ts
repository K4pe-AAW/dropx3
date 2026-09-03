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
 * JSON BlobをCDNではなくBlob originから読み、本文と同じ応答のETagを返す。
 * head()の最新ETagとCDNの古い本文を別々に取得すると、ifMatchが成功したまま古い本文で
 * 上書きできてしまうため、read-modify-writeでは必ずこの関数を使う。
 */
export async function readBlobJsonFromOrigin<T>(
  pathname: string,
  getter: BlobJsonGetter = get as BlobJsonGetter
): Promise<{ data: T; etag: string } | null> {
  const result = await getter(pathname, { access: "public", useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null

  const data = (await new Response(result.stream).json()) as T
  return { data, etag: result.blob.etag }
}
