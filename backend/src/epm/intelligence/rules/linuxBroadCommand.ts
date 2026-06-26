import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { collectAllTargets } from "../helpers/targets"

const isBroadLinuxCommand = (target: {
  kind: string
  platform: string
  fileName?: string
  fileNamePattern?: { value?: string; compareAs?: string }
  location?: string
  locationPattern?: { value?: string }
  publisher?: string
}): boolean => {
  if (target.kind !== "LinuxCommand" || target.platform !== "Linux") return false
  if (target.publisher?.trim()) return false
  if (target.location?.trim() || target.locationPattern?.value?.trim()) return false

  const fileName = target.fileName?.trim() ?? target.fileNamePattern?.value?.trim()
  if (!fileName) return true

  if (fileName === "*" || fileName === ".*") return true

  const compareAs = target.fileNamePattern?.compareAs?.toLowerCase()
  if (compareAs === "wildcards" && (fileName.includes("*") || fileName.includes("?"))) {
    return true
  }

  return false
}

export const linuxBroadCommandRule: PolicyRule = {
  id: "linux-broad-command",
  title: "Overly broad Linux command policy",
  description:
    "Checks Linux sudo/command policies with wildcard or unrestricted command matching and no path constraints.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit) continue

      const hits = collectAllTargets(policy, ctx.applicationGroups).filter(
        isBroadLinuxCommand
      )
      if (hits.length === 0) continue

      findings.push(
        makeFinding(
          linuxBroadCommandRule,
          policy,
          `Policy has ${hits.length} overly broad Linux command ${hits.length === 1 ? "definition" : "definitions"} (wildcard or unrestricted sudo command).`,
          {
            evidence: { broadLinuxCommands: hits.length },
            remediation:
              "Scope Linux command policies to explicit command paths and arguments instead of wildcards.",
          }
        )
      )
    }

    return findings
  },
}
