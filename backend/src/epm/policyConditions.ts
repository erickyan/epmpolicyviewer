import type { PolicyAdGroup, PolicyCondition, RunScriptPolicyConfig } from "../types"
import { decodeEmbeddedScriptContent } from "./embeddedScript"

type XmlNode = Record<string, unknown>

const attr = (node: XmlNode | undefined, name: string): string | undefined => {
  if (!node) return undefined
  const value = node[`@_${name}`]
  if (value === undefined || value === null) return undefined
  return String(value)
}

const getText = (node: unknown): string | undefined => {
  if (node === undefined || node === null) return undefined
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (typeof node !== "object") return undefined
  const record = node as XmlNode
  if (record["#text"] !== undefined) return String(record["#text"])
  return undefined
}

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

const parseAdGroups = (node: unknown): PolicyAdGroup[] => {
  if (!node || typeof node !== "object") return []
  const record = node as XmlNode
  return asArray(record.ADGroup as XmlNode | XmlNode[]).map((group) => ({
    name: getText(group)?.trim() ?? "",
    sid: attr(group, "SID"),
    accountType: attr(group, "accountType"),
  })).filter((group) => group.name || group.sid)
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  "0": "Invalid",
  "1": "Domain Controller is accessible",
  "2": "Specific URL is accessible",
  "3": "Host/IP is accessible (ping)",
  "4": "Script returns exit code 0",
  "5": "AD computer group membership",
}

export const getPolicyConditionTypeLabel = (type: string | undefined): string => {
  if (!type?.trim()) return "Condition"
  return CONDITION_TYPE_LABELS[type.trim()] ?? `Condition type ${type}`
}

const ACTION_TRIGGER_LABELS: Record<string, string> = {
  "0": "Invalid",
  "1": "On user logon",
  "2": "On user logoff",
  "3": "On computer startup",
  "4": "When new policy is received",
}

export const getActionTriggerLabel = (type: string | undefined): string => {
  if (!type?.trim()) return "Action trigger"
  return ACTION_TRIGGER_LABELS[type.trim()] ?? `Trigger type ${type}`
}

const buildConditionSummary = (condition: Omit<PolicyCondition, "summary">): string[] => {
  const lines: string[] = []
  if (condition.typeLabel) {
    lines.push(condition.typeLabel)
  }

  if (condition.includeAdComputerGroups.length > 0) {
    lines.push(
      `Include computers in: ${condition.includeAdComputerGroups
        .map((group) => group.name || group.sid || "AD group")
        .join(", ")}`
    )
  }

  if (condition.excludeAdComputerGroups.length > 0) {
    lines.push(
      `Exclude computers in: ${condition.excludeAdComputerGroups
        .map((group) => group.name || group.sid || "AD group")
        .join(", ")}`
    )
  }

  return lines
}

const parseConditionNode = (node: XmlNode): PolicyCondition => {
  const type = attr(node, "type") ?? "5"
  const base = {
    type,
    typeLabel: getPolicyConditionTypeLabel(type),
    includeAdComputerGroups: parseAdGroups(node.IncludeADComputerGroup),
    excludeAdComputerGroups: parseAdGroups(node.ExcludeADComputerGroup),
  }

  return {
    ...base,
    summary: buildConditionSummary(base),
  }
}

export const parsePolicyConditions = (policy: XmlNode): PolicyCondition[] =>
  asArray(policy.Condition as XmlNode | XmlNode[])
    .filter((node) => attr(node, "type") === "5")
    .map(parseConditionNode)

const parseActionTriggers = (policy: XmlNode) =>
  asArray(policy.ActionTrigger as XmlNode | XmlNode[]).map((trigger) => {
    const type = attr(trigger, "type") ?? ""
    return {
      type,
      label: getActionTriggerLabel(type),
    }
  })

export const buildRunScriptPolicy = (policy: XmlNode): RunScriptPolicyConfig | undefined => {
  if (attr(policy, "action") !== "9") return undefined

  const embedded = policy.EmbeddedScript as XmlNode | undefined
  if (!embedded) return undefined

  const scriptName = getText(embedded.ScriptName)?.trim()
  const contentNode = embedded.ScriptContent
  const rawContent = getText(contentNode)?.trim()
  const isBase64 =
    typeof contentNode === "object" &&
    contentNode !== null &&
    attr(contentNode as XmlNode, "base64")?.toLowerCase() === "true"

  const scriptContent = decodeEmbeddedScriptContent(rawContent, isBase64)

  if (!scriptName && !scriptContent) return undefined

  return {
    scriptName,
    scriptContent,
    scriptEncoding: isBase64 ? "base64" : "plain",
    actionTriggers: parseActionTriggers(policy),
  }
}
