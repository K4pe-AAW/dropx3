/**
 * 同一Functionインスタンス内で大きなBlobを短時間だけ共有するための小さなキャッシュ。
 *
 * Vercel Functionsは同じインスタンスが複数リクエストを処理することがあるため、
 * 数十MBのJSONを毎回Blobから取得するより、短いTTLで再利用した方が転送量を大幅に抑えられる。
 * 同時に期限切れした場合もloaderは1回だけ実行する。
 */
export class SingleFlightCache<T> {
  private value: T | undefined
  private expiresAt = 0
  private loading: Promise<T> | null = null

  constructor(private readonly ttlMs: number) {}

  async get(loader: () => Promise<T>, now = Date.now()): Promise<T> {
    if (this.value !== undefined && now < this.expiresAt) return this.value
    if (this.loading) return this.loading

    this.loading = loader()
      .then((value) => {
        this.value = value
        this.expiresAt = Date.now() + this.ttlMs
        return value
      })
      .finally(() => {
        this.loading = null
      })

    return this.loading
  }

  set(value: T, now = Date.now()) {
    this.value = value
    this.expiresAt = now + this.ttlMs
    this.loading = null
  }

  clear() {
    this.value = undefined
    this.expiresAt = 0
    this.loading = null
  }
}
