import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import {
  PROTECTED_FILESYSTEM_PATHS,
  PROTECTED_REGISTRY_PATHS,
} from "../data/protectedPaths"
import { pathMatchesProtectedEntry } from "../helpers/paths"
import { collectAllTargets } from "../helpers/targets"

const parseAllowAccess = (target: { attributes: Record<string, string> }): boolean => {
  const value = target.attributes.allowAccess?.trim().toLowerCase()
  if (!value) return false
  return value === "true" || value === "1"
}

const targetPath = (target: {
  location?: string
  fileName?: string
  attributes: Record<string, string>
}): string | undefined =>
  target.location?.trim() ||
  target.fileName?.trim() ||
  target.attributes.path?.trim() ||
  target.attributes.name?.trim()

export const protectedAgentPathRule: PolicyRule = {
  id: "protected-agent-path",
  title: "Set Security grants access to protected agent path",
  description:
    "Checks Set Security policies (action 11) that grant allowAccess on filesystem or registry paths matching curated CyberArk agent install/data locations.",
  severity: "critical",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/policies/accessfilesystemregistry-newui.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.action !== "11") continue

      for (const target of collectAllTargets(policy, ctx.applicationGroups)) {
        if (target.kind !== "FSEntry" && target.kind !== "RegKey") continue
        if (!parseAllowAccess(target)) continue

        const candidate = targetPath(target)
        if (!candidate) continue

        const protectedList =
          target.kind === "RegKey"
            ? PROTECTED_REGISTRY_PATHS
            : PROTECTED_FILESYSTEM_PATHS

        const matched = protectedList.find((entry) =>
          pathMatchesProtectedEntry(candidate, entry)
        )
        if (!matched) continue

        findings.push(
          makeFinding(
            protectedAgentPathRule,
            policy,
            `Set Security policy allows access to protected ${target.kind === "RegKey" ? "registry" : "folder"} path "${candidate}" (matches ${matched}).`,
            {
              evidence: {
                targetKind: target.kind,
                path: candidate,
                matchedProtectedPath: matched,
              },
              remediation:
                "Remove or deny access to EPM agent install/data paths and registry keys. Users should not receive allowAccess on CyberArk-protected locations.",
            }
          )
        )
      }
    }

    return findings
  },
}
