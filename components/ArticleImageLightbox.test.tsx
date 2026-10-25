import test from "node:test"
import assert from "node:assert/strict"
import { wrappedImageIndex } from "./ArticleImageLightbox"

test("wrappedImageIndex cycles forward and backward", () => {
  assert.equal(wrappedImageIndex(0, 1, 3), 1)
  assert.equal(wrappedImageIndex(2, 1, 3), 0)
  assert.equal(wrappedImageIndex(0, -1, 3), 2)
})

test("wrappedImageIndex stays at zero for a single image", () => {
  assert.equal(wrappedImageIndex(0, 1, 1), 0)
  assert.equal(wrappedImageIndex(0, -1, 0), 0)
})
