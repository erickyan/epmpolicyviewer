import type { TargetEntry } from "../types"

type XmlNode = Record<string, unknown>

export interface PatternMatch {
  value: string
  compareAs?: string
  caseSensitive?: boolean
  subfolders?: boolean
}

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

const parseBoolAttr = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined
  const normalized = value.toLowerCase()
  if (normalized === "true" || normalized === "1") return true
  if (normalized === "false" || normalized === "0") return false
  return undefined
}

export const parsePatternNode = (node: unknown): PatternMatch | undefined => {
  if (node === undefined || node === null) return undefined
  const record = (typeof node === "object" ? node : { "#text": node }) as XmlNode
  const value = getText(record)?.trim()
  if (!value) return undefined
  return {
    value,
    compareAs: attr(record, "compareAs"),
    caseSensitive: parseBoolAttr(attr(record, "caseSensitive")),
    subfolders: parseBoolAttr(attr(record, "subfolders")),
  }
}

const compareAsPhrase = (compareAs: string | undefined, value: string): string => {
  const mode = compareAs?.toLowerCase()
  if (mode === "exact") return `is exactly "${value}"`
  if (mode === "prefix") return `starts with "${value}"`
  if (mode === "wildcards" || value.includes("*") || value.includes("?")) {
    return `matches wildcard "${value}"`
  }
  if (mode === "contains") return `contains "${value}"`
  if (mode === "regex") return `matches regex "${value}"`
  return `is "${value}"`
}

const casePhrase = (caseSensitive?: boolean): string =>
  caseSensitive ? "case sensitive" : "case insensitive"

const formatPatternClause = (
  subject: string,
  pattern?: PatternMatch,
  options?: { directory?: boolean }
): string | undefined => {
  if (!pattern?.value) return undefined
  let clause = `${subject} ${compareAsPhrase(pattern.compareAs, pattern.value)}`
  if (options?.directory) {
    clause = `${subject} is in directory "${pattern.value}"`
    if (pattern.subfolders !== false) clause += " with subfolders"
  }
  clause += ` (${casePhrase(pattern.caseSensitive)})`
  return clause
}

export const targetKindDisplayLabel = (target: TargetEntry): string => {
  if (target.accessType?.toLowerCase() === "sudo") return "Sudo command"
  switch (target.kind) {
    case "MacExecutable":
      return "Executable"
    case "MacDmg":
      return "DMG"
    case "MacPKG":
      return "PKG"
    case "MacScript":
      return "Script"
    case "Executable":
      return "Executable"
    case "Dll":
      return "DLL"
    case "MSI":
      return "MSI"
    case "MSU":
      return "MSU"
    case "Script":
      return "Script"
    case "COM":
      return "COM"
    case "AdminTask":
      return "Admin task"
    case "MacAdminTask":
      return "macOS admin task"
    case "ApplicationGroup":
      return "Application group"
    case "FSEntry":
      return "File system"
    case "RegKey":
      return "Registry key"
    case "Exclude":
      return "Exclude"
    case "MacExclude":
      return "macOS exclude"
    default:
      return target.kind
  }
}

export const formatTargetDefinition = (target: TargetEntry): string => {
  if (target.definitionSummary) return target.definitionSummary

  const parts: string[] = []

  if (target.publisherPattern) {
    parts.push(
      formatPatternClause("Publisher's signature", target.publisherPattern) ??
        `Publisher is "${target.publisherPattern.value}"`
    )
  } else if (target.publisher) {
    parts.push(`Publisher is "${target.publisher}"`)
  }

  if (target.bundleIdPattern) {
    parts.push(
      formatPatternClause("Bundle ID", target.bundleIdPattern) ??
        `Bundle ID is "${target.bundleIdPattern.value}"`
    )
  } else if (target.bundleId) {
    parts.push(`Bundle ID is "${target.bundleId}"`)
  }

  if (target.accessType?.toLowerCase() === "sudo") {
    const command = target.fileNamePattern ?? (target.fileName ? { value: target.fileName, compareAs: "exact" } : undefined)
    if (command) {
      parts.push(formatPatternClause("Command", command) ?? `Command is "${command.value}"`)
    }
  } else {
    const fileClause = formatPatternClause("Filename", target.fileNamePattern)
    const locationClause = formatPatternClause("Location", target.locationPattern, {
      directory: !!target.locationPattern?.value?.startsWith("/"),
    })

    if (fileClause && locationClause) {
      parts.push(`${fileClause} AND ${locationClause}`)
    } else if (fileClause) {
      parts.push(fileClause)
    } else if (locationClause) {
      parts.push(locationClause)
    } else if (target.fileName) {
      parts.push(`Filename is "${target.fileName}"`)
    } else if (target.location) {
      parts.push(`Location is "${target.location}"`)
    }
  }

  if (target.serviceName) parts.push(`Service name is "${target.serviceName}"`)

  if (target.name && (target.kind === "AdminTask" || target.kind === "MacAdminTask")) {
    parts.push(target.name)
  }

  if (parts.length === 0) return "—"
  return parts.join(" · ")
}

export const enrichTargetDefinition = (
  entry: XmlNode,
  kind: string,
  target: TargetEntry
): TargetEntry => {
  const dmgFile = entry.DmgFile as XmlNode | undefined

  const publisherPattern = parsePatternNode(entry.Publisher)
  const bundleIdPattern = parsePatternNode(entry.BundleID)
  const fileNamePattern =
    parsePatternNode(entry.FileName) ?? parsePatternNode(dmgFile?.FileName)
  const locationPattern =
    parsePatternNode(entry.Location) ?? parsePatternNode(dmgFile?.Location)

  const bundleId = bundleIdPattern?.value
  const publisher = publisherPattern?.value ?? target.publisher
  const fileName = fileNamePattern?.value ?? target.fileName
  const location = locationPattern?.value ?? target.location

  const enriched: TargetEntry = {
    ...target,
    publisher,
    bundleId,
    fileName,
    location,
    publisherPattern,
    bundleIdPattern,
    fileNamePattern,
    locationPattern,
  }

  const fileNameNode = (entry.FileName ?? dmgFile?.FileName) as XmlNode | undefined
  if (fileNameNode && typeof fileNameNode === "object") {
    const hash = attr(fileNameNode, "hash")
    const hashAlgorithm = attr(fileNameNode, "hashAlgorithm")
    if (hash) enriched.attributes.hash = hash
    if (hashAlgorithm) enriched.attributes.hashAlgorithm = hashAlgorithm
  }

  enriched.definitionSummary = formatTargetDefinition(enriched)
  return enriched
}
