import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import {
  PROTECTED_OS_FOLDER_PATHS,
  PROTECTED_OS_REGISTRY_PATHS,
} from "../data/osProtectedPaths"
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

export const protectedOsFolderRule: PolicyRule = {
  id: "protected-os-folder",
  title: "Set Security grants access to protected OS folder",
  description:
    "Checks Set Security policies (action 11) that grant allowAccess on broad OS folders such as C:\\Windows or Program Files.",
  severity: "critical",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm",
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
            ? PROTECTED_OS_REGISTRY_PATHS
            : PROTECTED_OS_FOLDER_PATHS

        const matched = protectedList.find((entry) =>
          pathMatchesProtectedEntry(candidate, entry)
        )
        if (!matched) continue

        findings.push(
          makeFinding(
            protectedOsFolderRule,
            policy,
            `Set Security policy allows access to protected OS ${target.kind === "RegKey" ? "registry" : "folder"} path "${candidate}" (matches ${matched}).`,
            {
              evidence: {
                targetKind: target.kind,
                path: candidate,
                matchedProtectedPath: matched,
              },
              remediation:
                "Do not loosen access to core OS folders or registry hives. Restrict Set Security policies to narrowly scoped paths.",
            }
          )
        )
      }
    }

    return findings
  },
}
