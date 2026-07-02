export const decodeEmbeddedScriptContent = (
  raw: string | undefined,
  isBase64 = false
): string | undefined => {
  if (!raw?.trim()) return undefined

  const trimmed = raw.trim()
  if (!isBase64) return trimmed

  try {
    return Buffer.from(trimmed, "base64").toString("utf8")
  } catch {
    return trimmed
  }
}
