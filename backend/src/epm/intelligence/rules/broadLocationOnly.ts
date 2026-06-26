import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { targetHasLocationOnlyMatch, targetLocationValue } from "../helpers/broadLocations"
import {
  APPLICATION_DEFINITION_KINDS,
  collectAllTargets,
} from "../helpers/targets"

export const broadLocationOnlyRule: PolicyRule = {
  id: "broad-location-only",
  title: "Overly broad location-only match",
  description:
    "Checks for application definitions scoped only to a broad folder (for example %windir% or C:\\) without filename or publisher constraints.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || policy.action === "13") continue

      const hits = collectAllTargets(policy, ctx.applicationGroups).filter(
        (target) =>
          APPLICATION_DEFINITION_KINDS.has(target.kind) &&
          targetHasLocationOnlyMatch(target)
      )
      if (hits.length === 0) continue

      const locations = [
        ...new Set(
          hits
            .map((target) => targetLocationValue(target))
            .filter((value): value is string => !!value)
        ),
      ].join(", ")

      findings.push(
        makeFinding(
          broadLocationOnlyRule,
          policy,
          `Policy matches ${hits.length} application ${hits.length === 1 ? "definition" : "definitions"} by broad location only (${locations}).`,
          {
            evidence: { broadLocationTargets: hits.length, locations },
            remediation:
              "Add filename, publisher, or bundle constraints so the policy does not cover an entire OS directory tree.",
          }
        )
      )
    }

    return findings
  },
}
