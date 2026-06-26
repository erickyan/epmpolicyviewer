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

const SHELL_EXECUTABLES = new Set([
  "explorer.exe",
  "cmd.exe",
  "powershell.exe",
  "pwsh.exe",
  "wt.exe",
])

export interface ShellInheritableHit {
  shellName: string
  targetKind: string
  matchField: string
  matchValue: string
  viaAppGroup?: string
}

const normalize = (value: string): string => value.trim().toLowerCase()

const basename = (value: string): string => {
  const trimmed = value.trim()
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1]?.toLowerCase() ?? trimmed.toLowerCase()
}

const matchingShell = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined
  const base = basename(value)
  if (SHELL_EXECUTABLES.has(base)) return base

  for (const shell of SHELL_EXECUTABLES) {
    if (normalize(value).endsWith(`\\${shell}`) || normalize(value).endsWith(`/${shell}`)) {
      return shell
    }
    if (/%(?:windir|systemroot)%[\\/]*(?:system32[\\/]+)?(?:windowspowershell[\\/]+v1\.0[\\/]+)?(?:${shell.replace(".", "\\.")})/i.test(value)) {
      return shell
    }
  }

  return undefined
}

const patternReferencesShell = (pattern?: PatternMatch): string | undefined => {
  if (!pattern?.value?.trim()) return undefined
  return matchingShell(pattern.value)
}

export const targetMatchesShellParent = (target: TargetEntry): string | undefined => {
  if (target.platform !== "Windows") return undefined
  if (!WINDOWS_TARGET_KINDS.has(target.kind)) return undefined

  return (
    matchingShell(target.fileName) ??
    matchingShell(target.location) ??
    patternReferencesShell(target.fileNamePattern) ??
    patternReferencesShell(target.locationPattern) ??
    matchingShell(target.definitionSummary)
  )
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

export const findShellInheritableTargets = (
  policy: PolicyEntry,
  appGroups: ApplicationGroupEntry[]
): ShellInheritableHit[] => {
  const hits: ShellInheritableHit[] = []

  for (const target of policy.targets) {
    if (target.kind === "ApplicationGroup" && target.refId) {
      const members = resolveTargetMembers(target, appGroups)
      const groupInheritable = target.inheritable
      const groupName = target.name ?? target.refId

      for (const member of members) {
        const shellName = targetMatchesShellParent(member)
        if (!shellName) continue
        if (!member.inheritable && !groupInheritable) continue

        hits.push({
          shellName,
          targetKind: member.kind,
          matchField: describeMatchField(member),
          matchValue: describeMatchValue(member),
          viaAppGroup: groupName,
        })
      }
      continue
    }

    if (!target.inheritable) continue
    const shellName = targetMatchesShellParent(target)
    if (!shellName) continue

    hits.push({
      shellName,
      targetKind: target.kind,
      matchField: describeMatchField(target),
      matchValue: describeMatchValue(target),
    })
  }

  return hits
}

// Backward-compatible aliases for explorer-specific naming.
export type ExplorerInheritableHit = ShellInheritableHit
export const targetMatchesExplorerExe = (target: TargetEntry): boolean =>
  targetMatchesShellParent(target) === "explorer.exe"
export const findExplorerInheritableTargets = findShellInheritableTargets
