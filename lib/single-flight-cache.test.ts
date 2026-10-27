import assert from "node:assert/strict"
import test from "node:test"
import { SingleFlightCache } from "./single-flight-cache"

test("TTL内は同じ値を返し、期限後だけ再取得する", async () => {
  const cache = new SingleFlightCache<number>(1_000)
  let calls = 0
  const load = async () => ++calls

  assert.equal(await cache.get(load, 1_000), 1)
  assert.equal(await cache.get(load, 1_500), 1)
  assert.equal(await cache.get(load, Date.now() + 2_000), 2)
  assert.equal(calls, 2)
})

test("同時リクエストは1回の読み込みを共有する", async () => {
  const cache = new SingleFlightCache<number>(1_000)
  let calls = 0
  let release!: (value: number) => void
  const pending = new Promise<number>((resolve) => {
    release = resolve
  })
  const load = async () => {
    calls += 1
    return pending
  }

  const first = cache.get(load)
  const second = cache.get(load)
  release(7)

  assert.deepEqual(await Promise.all([first, second]), [7, 7])
  assert.equal(calls, 1)
})

test("書き込み後はsetした最新値を即時返す", async () => {
  const cache = new SingleFlightCache<number>(1_000)
  cache.set(9, 1_000)
  assert.equal(await cache.get(async () => 10, 1_500), 9)
})
