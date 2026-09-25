import assert from "node:assert/strict"
import test from "node:test"
import { serializeJsonLd } from "./json-ld"

test("JSON-LD内のscript終了文字とHTML記号を無害化する", () => {
  const value = serializeJsonLd({ title: "</script><b>A&B</b>" })
  assert.equal(value.includes("</script>"), false)
  assert.match(value, /\\u003c\/script\\u003e/)
  assert.match(value, /A\\u0026B/)
})
