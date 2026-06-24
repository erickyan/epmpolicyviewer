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

export const isVisibleTarget = (
  target: TargetEntry,
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): boolean => {
  if (!hideDefaults) return true
  if (target.matchesBaseline) return false
  if (target.kind === "ApplicationGroup") {
    const group = appGroups.find((entry) => entry.id === target.refId)
    if (group?.isDefault) return false
  }
  return true
}

export const filterVisibleTargets = (
  targets: TargetEntry[],
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): TargetEntry[] =>
  hideDefaults
    ? targets.filter((target) => isVisibleTarget(target, appGroups, true))
    : targets

export const resolvePolicyDefinitionCount = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): number => {
  if (!hideDefaults) return policy.definitionCount

  if (policy.hasExcludeBaseline) return policy.customizedDefinitionCount

  return policy.targets.reduce((sum, target) => {
    if (!isVisibleTarget(target, appGroups, true)) return sum
    if (target.kind === "ApplicationGroup") {
      return sum + resolveTargetMemberCount(target, appGroups)
    }
    return sum + 1
  }, 0)
}

export const hasSpecificTargeting = (policy: PolicyEntry): boolean =>
  policy.userGroups.length > 0

export const policyHasCustomizedContent = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[],
  hideDefaults: boolean
): boolean => {
  if (!hideDefaults) return true

  // Default scaffold policies normally apply to all users; narrowing scope is a modification.
  if (hasSpecificTargeting(policy)) return true

  if (policy.hasExcludeBaseline && policy.customizedDefinitionCount > 0) return true

  // Tenant LCD / endpoint sign-in policies have no application targets but are still customized.
  if (!policy.implicit && (policy.lcdPolicy || policy.endpointSignIn)) return true

  // Unmodified implicit/default scaffold policies stay hidden.
  if (policy.implicit) return false

  return resolvePolicyDefinitionCount(policy, appGroups, true) > 0
}
