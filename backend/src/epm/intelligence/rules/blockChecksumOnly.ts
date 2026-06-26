import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { targetHasChecksumOnly } from "../helpers/checksum"
import {
  APPLICATION_DEFINITION_KINDS,
  collectAllTargets,
} from "../helpers/targets"

export const blockChecksumOnlyRule: PolicyRule = {
  id: "block-checksum-only",
  title: "Block policy using checksum only",
  description:
    "Checks Block policies (action 2) that rely on checksum/hash matching without publisher or path constraints.",
  severity: "info",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.action !== "2" || policy.implicit) continue

      const hits = collectAllTargets(policy, ctx.applicationGroups).filter(
        (target) =>
          APPLICATION_DEFINITION_KINDS.has(target.kind) &&
          targetHasChecksumOnly(target)
      )
      if (hits.length === 0) continue

      findings.push(
        makeFinding(
          blockChecksumOnlyRule,
          policy,
          `Block policy uses checksum-only matching for ${hits.length} application ${hits.length === 1 ? "definition" : "definitions"}.`,
          {
            evidence: { checksumOnlyTargets: hits.length },
            remediation:
              "CyberArk recommends combining publisher and path with block rules where possible. Checksum-only block rules are harder to maintain across updates.",
          }
        )
      )
    }

    return findings
  },
}
