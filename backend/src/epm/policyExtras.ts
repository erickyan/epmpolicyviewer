import type { PolicyAdditionalFile, UserGroupExclusionEntry, UserGroupExclusions } from "../types"
import { decodeEmbeddedScriptContent } from "./embeddedScript"

type XmlNode = Record<string, unknown>

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const getText = (node: unknown): string | undefined => {
  if (node === undefined || node === null) return undefined
  if (Array.isArray(node)) {
    const parts = node.map(getText).filter((v): v is string => v !== undefined)
    return parts.length ? parts.join(", ") : undefined
  }
  if (typeof node === "object") {
    const record = node as XmlNode
    if ("#text" in record) return String(record["#text"])
    return undefined
  }
  return String(node)
}

const attr = (node: XmlNode, name: string): string | undefined => {
  const value = node[`@_${name}`]
  return value === undefined || value === null ? undefined : String(value)
}

const parseExclusionEntries = (node: XmlNode): UserGroupExclusionEntry[] => {
  const entries: UserGroupExclusionEntry[] = []

  for (const [kind, rawValue] of Object.entries(node)) {
    if (kind.startsWith("@_") || kind === "#text") continue

    for (const item of asArray(rawValue)) {
      const value = getText(item)?.trim()
      if (!value) continue

      entries.push({
        kind,
        value,
        sid:
          typeof item === "object" && item !== null
            ? attr(item as XmlNode, "SID")
            : undefined,
        accountType:
          typeof item === "object" && item !== null
            ? attr(item as XmlNode, "accountType")
            : undefined,
      })
    }
  }

  return entries
}

const buildExclusionSummary = (
  operator: string | undefined,
  entries: UserGroupExclusionEntry[]
): string => {
  const names = entries.map((entry) => entry.value).join(", ")
  if (operator?.toUpperCase() === "AND") {
    return `Exclude users who belong to all of: ${names}`
  }
  return `Exclude users who belong to any of: ${names}`
}

export const parseUserGroupExclusions = (
  policy: XmlNode
): UserGroupExclusions | undefined => {
  const node = policy.UserGroupExclusions as XmlNode | undefined
  if (!node || typeof node !== "object") return undefined

  const entries = parseExclusionEntries(node)
  if (entries.length === 0) return undefined

  const operator = attr(node, "operator")
  return {
    operator,
    entries,
    summary: buildExclusionSummary(operator, entries),
  }
}

export const parseAdditionalFiles = (
  policy: XmlNode
): PolicyAdditionalFile[] | undefined => {
  const node = policy.AdditionalFiles as XmlNode | undefined
  if (!node || typeof node !== "object") return undefined

  const files = asArray(node.File as XmlNode | XmlNode[])
    .map((file) => {
      const fileName = getText(file.FileName)?.trim() ?? ""
      const contentNode = file.FileContent
      const rawContent = getText(contentNode)?.trim()
      const isBase64 =
        typeof contentNode === "object" &&
        contentNode !== null &&
        attr(contentNode as XmlNode, "base64")?.toLowerCase() === "true"

      return {
        fileName,
        content: decodeEmbeddedScriptContent(rawContent, isBase64),
        encoding: isBase64 ? ("base64" as const) : ("plain" as const),
      }
    })
    .filter((file) => file.fileName || file.content)

  return files.length > 0 ? files : undefined
}
