import type { ApplicationGroupEntry, PatternMatch, PolicyEntry, TargetEntry } from "../../../types"
import { resolveTargetMembers } from "./targets"

const WINDOWS_TARGET_KINDS = new Set([
  "Executable",
  "Dll",
  "Script",
  "COM",
  "ActiveXInstall",
  "Exclude",
])

export interface ExplorerInheritableHit {
  targetKind: string
  matchField: string
  matchValue: string
  viaAppGroup?: string
}

const normalize = (value: string): string => value.trim().toLowerCase()

const textReferencesExplorer = (value?: string): boolean => {
  if (!value?.trim()) return false
  const normalized = normalize(value)
  if (normalized === "explorer.exe") return true
  if (/(?:^|[\\/])explorer\.exe$/i.test(value.trim())) return true
  if (/%(?:windir|systemroot)%[\\/]*explorer\.exe/i.test(value)) return true
  if (/[\\/]windows[\\/]+explorer\.exe/i.test(value)) return true
  return false
}

const patternReferencesExplorer = (pattern?: PatternMatch): boolean => {
  if (!pattern?.value?.trim()) return false
  return textReferencesExplorer(pattern.value)
}

export const targetMatchesExplorerExe = (target: TargetEntry): boolean => {
  if (target.platform !== "Windows") return false
  if (!WINDOWS_TARGET_KINDS.has(target.kind)) return false

  if (textReferencesExplorer(target.fileName)) return true
  if (textReferencesExplorer(target.location)) return true
  if (patternReferencesExplorer(target.fileNamePattern)) return true
  if (patternReferencesExplorer(target.locationPattern)) return true
  if (textReferencesExplorer(target.definitionSummary)) return true

  return false
}

const describeMatchField = (target: TargetEntry): string => {
  if (target.fileName?.trim()) return "fileName"
  if (target.fileNamePattern?.value?.trim()) return "fileNamePattern"
  if (target.location?.trim()) return "location"
  if (target.locationPattern?.value?.trim()) return "locationPattern"
  if (target.definitionSummary?.trim()) return "definitionSummary"
  return "target"
}

const describeMatchValue = (target: TargetEntry): string =>
  target.fileName?.trim() ??
  target.fileNamePattern?.value?.trim() ??
  target.location?.trim() ??
  target.locationPattern?.value?.trim() ??
  target.definitionSummary?.trim() ??
  target.kind

export const findExplorerInheritableTargets = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[]
): ExplorerInheritableHit[] => {
  const hits: ExplorerInheritableHit[] = []

  for (const target of policy.targets) {
    if (target.kind === "ApplicationGroup" && target.refId) {
      const members = resolveTargetMembers(target, appGroups)
      const groupInheritable = target.inheritable
      const groupName = target.name ?? target.refId

      for (const member of members) {
        if (!targetMatchesExplorerExe(member)) continue
        if (!member.inheritable && !groupInheritable) continue

        hits.push({
          targetKind: member.kind,
          matchField: describeMatchField(member),
          matchValue: describeMatchValue(member),
          viaAppGroup: groupName,
        })
      }
      continue
    }

    if (!target.inheritable) continue
    if (!targetMatchesExplorerExe(target)) continue

    hits.push({
      targetKind: target.kind,
      matchField: describeMatchField(target),
      matchValue: describeMatchValue(target),
    })
  }

  return hits
}
