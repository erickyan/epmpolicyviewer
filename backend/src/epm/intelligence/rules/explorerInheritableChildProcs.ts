import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { findExplorerInheritableTargets } from "../helpers/explorer"

export const explorerInheritableChildProcsRule: PolicyRule = {
  id: "explorer-inheritable-child-procs",
  title: "Explorer.exe with child process inheritance",
  description:
    "Checks for Windows targets matching explorer.exe with child process inheritance enabled (inheritable=\"True\"), including definitions inside application groups.",
  severity: "critical",
  docUrl:
    "https://community.cyberark.com/s/article/EPM-Policies-for-Explorer-exe-with-child-processes",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      const hits = findExplorerInheritableTargets(policy, ctx.applicationGroups)
      if (hits.length === 0) continue

      const viaGroups = [
        ...new Set(hits.map((hit) => hit.viaAppGroup).filter(Boolean)),
      ] as string[]
      const matchSummary = hits
        .map((hit) =>
          hit.viaAppGroup
            ? `${hit.matchValue} (via ${hit.viaAppGroup})`
            : hit.matchValue
        )
        .join("; ")

      findings.push(
        makeFinding(
          explorerInheritableChildProcsRule,
          policy,
          `Policy covers explorer.exe with child process inheritance (${policy.actionLabel}). Apps launched from Explorer may inherit this action instead of their intended policy.`,
          {
            evidence: {
              inheritableTargets: hits.length,
              matchSummary,
              ...(viaGroups.length > 0 ? { applicationGroups: viaGroups.join(", ") } : {}),
            },
            remediation:
              "Remove child process inheritance from the explorer.exe application definition or application group entry, request settings on the endpoint, then reboot. Do not cover explorer.exe with inheritable policies.",
          }
        )
      )
    }

    return findings
  },
}
