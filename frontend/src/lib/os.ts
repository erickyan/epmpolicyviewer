import type { GuiDialog, PolicyDocument, PolicyEntry } from "../types"

export type OsFilterValue = "all" | "Windows" | "macOS" | "Linux"

export const OS_OPTIONS: Exclude<OsFilterValue, "all">[] = [
  "Windows",
  "macOS",
  "Linux",
]

// Some targets (e.g. <ApplicationGroup>) reference an app group defined
// elsewhere and carry no concrete OS, so they are tagged "Any". These must NOT
// be treated as "every OS" for filtering, otherwise an OS-specific policy that
// references an app group would leak into all OS filters. When a policy has no
// concrete-OS target we fall back to OS hints in its name.
const inferPlatformsFromName = (name: string): string[] => {
  const platforms: string[] = []
  if (/\bmac(?:os)?\b/i.test(name)) platforms.push("macOS")
  if (/\bwindows\b|\bwin\b/i.test(name)) platforms.push("Windows")
  if (/\blinux\b/i.test(name)) platforms.push("Linux")
  return platforms
}

export const getPolicyPlatforms = (policy: PolicyEntry): string[] => {
  const concrete = new Set<string>()
  for (const target of policy.targets) {
    if (target.platform === "Any") continue
    concrete.add(target.platform)
  }
  if (concrete.size > 0) return [...concrete]
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
  for (const dialog of doc.gui) present.add(dialog.os)

  return OS_OPTIONS.filter((os) => present.has(os))
}
