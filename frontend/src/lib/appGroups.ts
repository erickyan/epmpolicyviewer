import type { ApplicationGroupEntry, PolicyEntry, TargetEntry } from "../types"

export const resolveTargetMembers = (
  target: TargetEntry,
  appGroups: ApplicationGroupEntry[]
): TargetEntry[] => {
  if (target.kind === "ApplicationGroup" && target.refId) {
    return appGroups.find((group) => group.id === target.refId)?.members ?? []
  }
  return target.members ?? []
}

export const resolveTargetMemberCount = (
  target: TargetEntry,
  appGroups: ApplicationGroupEntry[]
): number => {
  if (typeof target.memberCount === "number") return target.memberCount
  return resolveTargetMembers(target, appGroups).length
}

export const formatDefinitionCount = (count: number): string =>
  `${count.toLocaleString()} ${count === 1 ? "definition" : "definitions"}`

export const resolvePolicyDefinitionCount = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): number => {
  if (!hideDefaults) return policy.definitionCount

  let count = policy.customizedDefinitionCount

  // For policies outside the exclude baseline, still hide default app group members.
  if (count === policy.definitionCount) {
    count = policy.targets.reduce((sum, target) => {
      if (target.kind === "ApplicationGroup") {
        const group = appGroups.find((entry) => entry.id === target.refId)
        if (group?.isDefault) return sum
        return sum + resolveTargetMemberCount(target, appGroups)
      }
      return sum + 1
    }, 0)
  }

  return count
}

export const policyHasCustomizedContent = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): boolean => {
  if (!hideDefaults) return true
  if (policy.implicit) return false
  return resolvePolicyDefinitionCount(policy, appGroups, true) > 0
}
