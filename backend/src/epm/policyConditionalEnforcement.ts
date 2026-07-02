import type { ConditionalEnforcementEntry, ConditionalEnforcementScript } from "../types"
import { decodeEmbeddedScriptContent } from "./embeddedScript"
import { getPolicyConditionTypeLabel } from "./policyConditions"

type XmlNode = Record<string, unknown>

const CONDITIONAL_ENFORCEMENT_TYPES = new Set(["1", "2", "3", "4"])

const attr = (node: XmlNode | undefined, name: string): string | undefined => {
  if (!node) return undefined
  const value = node[`@_${name}`]
  if (value === undefined || value === null) return undefined
  return String(value)
}

const getText = (node: unknown): string | undefined => {
  if (node === undefined || node === null) return undefined
  if (typeof node === "boolean") return node ? "true" : "false"
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (typeof node !== "object") return undefined
  const record = node as XmlNode
  if (record["#text"] !== undefined) return String(record["#text"])
  return undefined
}

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const readField = (
  node: XmlNode | undefined,
  ...names: string[]
): string | undefined => {
  if (!node) return undefined

  for (const name of names) {
    const child = node[name]
    const text = getText(child)?.trim()
    if (text) return text

    const attribute = attr(node, name)
    if (attribute?.trim()) return attribute.trim()
  }

  return undefined
}

const parseBooleanValue = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (["true", "1", "yes"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  return undefined
}

const readBooleanField = (
  node: XmlNode | undefined,
  ...names: string[]
): boolean | undefined => {
  if (!node) return undefined

  for (const name of names) {
    const child = node[name]
    if (typeof child === "boolean") return child
    const parsed = parseBooleanValue(getText(child))
    if (parsed !== undefined) return parsed
    const attribute = parseBooleanValue(attr(node, name))
    if (attribute !== undefined) return attribute
  }

  return undefined
}

const parseEmbeddedScript = (
  node: XmlNode | undefined
): ConditionalEnforcementScript | undefined => {
  if (!node || typeof node !== "object") return undefined

  const fileName =
    getText(node.ScriptName)?.trim() ??
    getText(node.FileName)?.trim() ??
    readField(node, "ScriptName", "FileName")
  const contentNode = node.ScriptContent ?? node.Content
  const rawContent = getText(contentNode)?.trim()
  const isBase64 =
    typeof contentNode === "object" &&
    contentNode !== null &&
    attr(contentNode as XmlNode, "base64")?.toLowerCase() === "true"
  const content = decodeEmbeddedScriptContent(rawContent, isBase64)
  const shortcutName = getText(node.ShortcutName)?.trim()

  if (!fileName && !content && !shortcutName) return undefined

  return {
    fileName,
    content,
    encoding: isBase64 ? "base64" : "plain",
    shortcutName,
  }
}

export const getConditionalEnforcementNetworkScopeLabel = (
  conditionType: string,
  inCorporateNetwork?: boolean
): string | undefined => {
  if (conditionType === "4") return undefined
  if (inCorporateNetwork === undefined) return undefined
  return inCorporateNetwork
    ? "Enforce within corporate network only"
    : "Enforce outside corporate network only"
}

export const getConditionalEnforcementChoiceLabel = (
  conditionType: string,
  inCorporateNetwork?: boolean
): string => {
  const withinCorp = inCorporateNetwork === true

  switch (conditionType) {
    case "1":
      return withinCorp
        ? "Domain controller is accessible"
        : "Domain controller is not accessible"
    case "2":
      return withinCorp
        ? "Online resource is accessible"
        : "Online resource is not accessible"
    case "3":
      return withinCorp
        ? "Computer is accessible"
        : "Computer is not accessible"
    case "4":
      return "Enforce when script returns 0"
    default:
      return getPolicyConditionTypeLabel(conditionType)
  }
}

const buildConditionalEnforcementSummary = (
  entry: Omit<ConditionalEnforcementEntry, "summary">
): string[] => {
  const lines: string[] = []

  if (entry.networkScopeLabel) {
    lines.push(entry.networkScopeLabel)
  }

  lines.push(entry.conditionChoiceLabel)

  if (entry.additionalCondition) {
    lines.push(`Target: ${entry.additionalCondition}`)
  }

  if (entry.script?.fileName) {
    lines.push(`Validation script: ${entry.script.fileName}`)
  }

  return lines
}

const parseConditionalEnforcementNode = (
  node: XmlNode,
  conditionType: string
): ConditionalEnforcementEntry | undefined => {
  const normalizedType = conditionType.trim()
  if (!CONDITIONAL_ENFORCEMENT_TYPES.has(normalizedType)) return undefined

  const additionalCondition = readField(
    node,
    "AdditionalCondition",
    "additionalCondition"
  )
  const inCorporateNetwork = readBooleanField(
    node,
    "InCorporateNetwork",
    "inCorporateNetwork"
  )
  const script = parseEmbeddedScript(node.EmbeddedScript as XmlNode | undefined)

  const base = {
    conditionType: normalizedType,
    conditionTypeLabel: getPolicyConditionTypeLabel(normalizedType),
    additionalCondition,
    inCorporateNetwork,
    networkScopeLabel: getConditionalEnforcementNetworkScopeLabel(
      normalizedType,
      inCorporateNetwork
    ),
    conditionChoiceLabel: getConditionalEnforcementChoiceLabel(
      normalizedType,
      inCorporateNetwork
    ),
    script,
  }

  return {
    ...base,
    summary: buildConditionalEnforcementSummary(base),
  }
}

const resolveConditionType = (node: XmlNode): string | undefined => {
  const fromAttribute = attr(node, "type")
  if (fromAttribute?.trim()) return fromAttribute.trim()

  const fromField = readField(node, "ConditionType", "conditionType")
  return fromField?.trim() || undefined
}

export const parseConditionalEnforcement = (
  policy: XmlNode
): ConditionalEnforcementEntry[] => {
  const entries: ConditionalEnforcementEntry[] = []

  for (const node of asArray(policy.Condition as XmlNode | XmlNode[])) {
    const conditionType = resolveConditionType(node)
    if (!conditionType) continue
    const entry = parseConditionalEnforcementNode(node, conditionType)
    if (entry) entries.push(entry)
  }

  for (const node of asArray(
    policy.ConditionalEnforcement as XmlNode | XmlNode[]
  )) {
    const conditionType = resolveConditionType(node)
    if (!conditionType) continue
    const entry = parseConditionalEnforcementNode(node, conditionType)
    if (entry) entries.push(entry)
  }

  return entries
}
