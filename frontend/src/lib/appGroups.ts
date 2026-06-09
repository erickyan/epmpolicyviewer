import type { ApplicationGroupEntry, TargetEntry } from "../types"

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
