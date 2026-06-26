import type { PolicyEntry } from "../../../types"
import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

const INSTALLED_BY_INTERNAL_TYPES = new Set([
  "221",
  "231",
  "244",
  "265",
  "281",
  "291",
  "1281",
])

const isInstalledByCompanion = (policy: PolicyEntry): boolean =>
  /^installed by:/i.test(policy.name.trim()) ||
  INSTALLED_BY_INTERNAL_TYPES.has(policy.internalType ?? "")

const targetSignature = (policy: PolicyEntry): string =>
  policy.targets
    .map((target) =>
      [
        target.kind,
        target.platform,
        target.publisher ?? "",
        target.location ?? "",
        target.fileName ?? "",
        target.accessType ?? "",
        target.name ?? "",
        target.refId ?? "",
      ]
        .join("~")
        .toLowerCase()
    )
    .sort()
    .join("|")

const userGroupSignature = (policy: PolicyEntry): string =>
  policy.userGroups
    .map((group) =>
      [group.kind, group.value, group.accountType ?? "", group.scopeId]
        .join("~")
        .toLowerCase()
    )
    .sort()
    .join("|")

const targetingSignature = (policy: PolicyEntry): string => {
  if (policy.userGroups.length > 0) return userGroupSignature(policy)
  if (policy.scopes.length > 0) {
    return policy.scopes
      .map((scope) => scope.id)
      .sort()
      .join("|")
  }
  return "all-users"
}

const contentSignature = (policy: PolicyEntry): string =>
  `${policy.action}|${targetSignature(policy)}|${targetingSignature(policy)}`

export const duplicatePoliciesRule: PolicyRule = {
  id: "duplicate-policies",
  title: "Potential duplicate policy",
  description:
    "Checks for non-default policies sharing the same action, targets, and user targeting, or duplicate policy names. Implicit and “Installed by:” companion policies are excluded.",
  severity: "info",
  evaluate: (ctx) => {
    const findings = []
    const seenIdSets = new Set<string>()

    const candidates = ctx.allPolicies.filter(
      (entry) => !entry.implicit && !isInstalledByCompanion(entry)
    )

    const byContent = new Map<string, PolicyEntry[]>()
    for (const entry of candidates) {
      if (entry.targetCount === 0) continue
      const signature = contentSignature(entry)
      const list = byContent.get(signature) ?? []
      list.push(entry)
      byContent.set(signature, list)
    }

    for (const list of byContent.values()) {
      if (list.length < 2) continue
      const idKey = list
        .map((entry) => entry.id)
        .sort()
        .join(",")
      if (seenIdSets.has(idKey)) continue
      seenIdSets.add(idKey)

      for (const policy of list) {
        const others = list.filter((entry) => entry.id !== policy.id)
        findings.push(
          makeFinding(
            duplicatePoliciesRule,
            policy,
            `Same action, targets, and user targeting as ${others.length} other ${others.length === 1 ? "policy" : "policies"} (${others.map((entry) => entry.name).join("; ")}).`,
            {
              title: "Potential duplicate policy (identical configuration)",
              evidence: { duplicateCount: list.length, duplicateGroupKey: idKey },
              remediation:
                "Review whether these policies can be consolidated to reduce precedence conflicts.",
            }
          )
        )
      }
    }

    const byName = new Map<string, PolicyEntry[]>()
    for (const entry of candidates) {
      const key = entry.name.trim().toLowerCase()
      if (!key) continue
      const list = byName.get(key) ?? []
      list.push(entry)
      byName.set(key, list)
    }

    for (const list of byName.values()) {
      if (list.length < 2) continue
      const idKey = list
        .map((entry) => entry.id)
        .sort()
        .join(",")
      if (seenIdSets.has(idKey)) continue
      seenIdSets.add(idKey)

      for (const policy of list) {
        findings.push(
          makeFinding(
            duplicatePoliciesRule,
            policy,
            `Policy name "${policy.name}" is shared by ${list.length} policies.`,
            {
              title: "Potential duplicate policy (duplicate name)",
              evidence: { duplicateCount: list.length, duplicateGroupKey: idKey },
              remediation:
                "Ensure duplicate names are intentional; rename or merge policies if not.",
            }
          )
        )
      }
    }

    return findings
  },
}
