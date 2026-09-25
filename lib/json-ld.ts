/** JSON-LD内の`</script>`等でscript要素を途中終了させない安全なシリアライザ。 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}
