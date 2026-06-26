import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { targetHasChecksumOnly } from "../helpers/checksum"
import {
  APPLICATION_DEFINITION_KINDS,
  collectAllTargets,
} from "../helpers/targets"

export const checksumOnlyMatchRule: PolicyRule = {
  id: "checksum-only-match",
  title: "Checksum-only application match",
  description:
    "Checks for application definitions matched only by file checksum/hash without publisher signature or path constraints.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || policy.action === "13") continue

      const hits = collectAllTargets(policy, ctx.applicationGroups).filter(
        (target) =>
          APPLICATION_DEFINITION_KINDS.has(target.kind) &&
          targetHasChecksumOnly(target)
      )
      if (hits.length === 0) continue

      findings.push(
        makeFinding(
          checksumOnlyMatchRule,
          policy,
          `Policy has ${hits.length} application ${hits.length === 1 ? "definition" : "definitions"} matched by checksum only (no publisher or path).`,
          {
            evidence: {
              checksumOnlyTargets: hits.length,
              hashAlgorithm: hits[0]?.attributes.hashAlgorithm ?? "unknown",
            },
            remediation:
              "Prefer publisher signature plus path or filename constraints. Checksum-only matching is easier to bypass and harder to audit.",
          }
        )
      )
    }

    return findings
  },
}
