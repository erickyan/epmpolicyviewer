import type { GuiDialog, PolicyDocument, PolicyEntry } from "../types"

export type OsFilterValue = "all" | "Windows" | "macOS" | "Linux"

export const OS_OPTIONS: Exclude<OsFilterValue, "all">[] = [
  "Windows",
  "macOS",
  "Linux",
]

const inferPlatformsFromName = (name: string): string[] => {
  const platforms: string[] = []
  if (/\bmac(?:os)?\b/i.test(name)) platforms.push("macOS")
  if (/\bwindows\b|\bwin\b/i.test(name)) platforms.push("Windows")
  if (/\blinux\b|\bunix\b|\bnix\b/i.test(name)) platforms.push("Linux")
  return platforms
}

const inferPlatformsFromEndpointSignIn = (policy: PolicyEntry): string[] => {
  if (!policy.endpointSignIn) return []

  if (policy.endpointSignIn.variant === "linux") return ["Linux"]

  const platforms: string[] = []
  if (policy.winMav) platforms.push("Windows")
  if (policy.macMav) platforms.push("macOS")
  return platforms
}

const inferPlatformsFromTargets = (policy: PolicyEntry): string[] => {
  const concrete = new Set<string>()
  for (const target of policy.targets) {
    if (target.platform === "Any") continue
    concrete.add(target.platform)
  }
  return [...concrete]
}

export const getPolicyPlatforms = (policy: PolicyEntry): string[] => {
  if (policy.platform) return [policy.platform]

  const fromTargets = inferPlatformsFromTargets(policy)
  if (fromTargets.length > 0) return fromTargets

  const fromEndpointSignIn = inferPlatformsFromEndpointSignIn(policy)
  if (fromEndpointSignIn.length > 0) return fromEndpointSignIn

  if (policy.lcdPolicy) {
    const fromName = inferPlatformsFromName(policy.name)
    return fromName.length > 0 ? fromName : ["Linux"]
  }

  return inferPlatformsFromName(policy.name)
}

// A policy matches when the filter is "all" or it resolves to that concrete OS.
// Policies with no resolvable OS are only shown under "all".
export const policyMatchesOs = (
  policy: PolicyEntry,
  filter: OsFilterValue
): boolean => {
  if (filter === "all") return true
  return getPolicyPlatforms(policy).includes(filter)
}

export const dialogMatchesOs = (
  dialog: GuiDialog,
  filter: OsFilterValue
): boolean => {
  if (filter === "all") return true
  return dialog.os === filter || dialog.os === "Any"
}

// Which concrete OSes actually appear anywhere in the document.
export const availableOsesFor = (doc: PolicyDocument): OsFilterValue[] => {
  const present = new Set<string>()
  const collect = (policies: PolicyEntry[]) => {
    for (const policy of policies) {
      for (const platform of getPolicyPlatforms(policy)) present.add(platform)
    }
  }
  collect(doc.normalPolicies)
  collect(doc.excludedPolicies)
  collect(doc.threatProtectionPolicies)
  for (const dialog of doc.gui) present.add(dialog.os)

  return OS_OPTIONS.filter((os) => present.has(os))
}
