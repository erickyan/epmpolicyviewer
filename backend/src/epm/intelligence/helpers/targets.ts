import type {
  ApplicationGroupEntry,
  PolicyEntry,
  TargetEntry,
} from "../../../types"

export const resolveTargetMembers = (
  target: TargetEntry,
  appGroups: ApplicationGroupEntry[]
): TargetEntry[] => {
  if (target.kind === "ApplicationGroup" && target.refId) {
    return appGroups.find((group) => group.id === target.refId)?.members ?? []
  }
  return []
}

export const collectAllTargets = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[]
): TargetEntry[] => {
  const results: TargetEntry[] = []
  for (const target of policy.targets) {
    if (target.kind === "ApplicationGroup") {
      results.push(...resolveTargetMembers(target, appGroups))
    } else {
      results.push(target)
    }
  }
  return results
}

export const targetPublisherValue = (target: TargetEntry): string | undefined =>
  target.publisherPattern?.value ?? target.publisher

const MAC_BROAD_PUBLISHER = "software signing"
const WIN_BROAD_PUBLISHER = "microsoft windows"

export const isBroadOsPublisher = (
  target: TargetEntry,
  publisher: string
): boolean => {
  const normalized = publisher.trim().toLowerCase()
  if (target.platform === "macOS") return normalized === MAC_BROAD_PUBLISHER
  if (target.platform === "Windows") return normalized === WIN_BROAD_PUBLISHER
  return false
}

export const targetHasPublisher = (target: TargetEntry): boolean =>
  !!targetPublisherValue(target)?.trim()

export const targetIsPublisherOnly = (target: TargetEntry): boolean => {
  if (!targetHasPublisher(target)) return false
  if (target.location?.trim()) return false
  if (target.fileName?.trim()) return false
  if (target.bundleId?.trim()) return false
  if (target.serviceName?.trim()) return false
  if (target.fileNamePattern?.value?.trim()) return false
  if (target.locationPattern?.value?.trim()) return false
  if (target.bundleIdPattern?.value?.trim()) return false
  if (target.kind === "AdminTask" || target.kind === "MacAdminTask") {
    if (target.name?.trim()) return false
  }
  if (target.kind === "Script" || target.kind === "LinuxCommand") return false
  return true
}

export const PUBLISHER_TARGET_KINDS = new Set([
  "Executable",
  "MacExecutable",
  "Dll",
  "MSI",
  "MSU",
  "Script",
  "COM",
  "ActiveXInstall",
])
