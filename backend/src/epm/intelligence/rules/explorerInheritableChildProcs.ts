import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { findShellInheritableTargets } from "../helpers/shellInheritable"

export const explorerInheritableChildProcsRule: PolicyRule = {
  id: "explorer-inheritable-child-procs",
  title: "Shell parent with child process inheritance",
  description:
    "Checks for Windows targets matching explorer.exe, cmd.exe, powershell.exe, pwsh.exe, or wt.exe with child process inheritance enabled, including definitions inside application groups.",
  severity: "critical",
  docUrl:
    "https://community.cyberark.com/s/article/EPM-Policies-for-Explorer-exe-with-child-processes",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      const hits = findShellInheritableTargets(policy, ctx.applicationGroups)
      if (hits.length === 0) continue

      const shells = [...new Set(hits.map((hit) => hit.shellName))].join(", ")
      const viaGroups = [
        ...new Set(hits.map((hit) => hit.viaAppGroup).filter(Boolean)),
      ] as string[]
      const matchSummary = hits
        .map((hit) =>
          hit.viaAppGroup
            ? `${hit.shellName}: ${hit.matchValue} (via ${hit.viaAppGroup})`
            : `${hit.shellName}: ${hit.matchValue}`
        )
        .join("; ")

      findings.push(
        makeFinding(
          explorerInheritableChildProcsRule,
          policy,
          `Policy covers shell parent process${hits.length === 1 ? "" : "es"} (${shells}) with child process inheritance (${policy.actionLabel}). Child processes may inherit this action instead of their intended policy.`,
          {
            evidence: {
              inheritableTargets: hits.length,
              shells,
              matchSummary,
              ...(viaGroups.length > 0 ? { applicationGroups: viaGroups.join(", ") } : {}),
            },
            remediation:
              "Remove child process inheritance from shell parent definitions (explorer.exe, cmd.exe, PowerShell, Windows Terminal) or move them out of inheritable application groups, then reboot endpoints.",
          }
        )
      )
    }

    return findings
  },
}
