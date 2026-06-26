import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import {
  APPLICATION_DEFINITION_KINDS,
  collectAllTargets,
} from "../helpers/targets"

const SKIP_ACTIONS = new Set(["10", "13", "15", "16"])

export const missingTargetDescriptionRule: PolicyRule = {
  id: "missing-target-description",
  title: "Missing application description",
  description:
    "Checks custom policies with application definitions that lack a per-target description (product or solution name).",
  severity: "info",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || SKIP_ACTIONS.has(policy.action)) continue
      if (policy.targetCount === 0) continue

      const missing = collectAllTargets(policy, ctx.applicationGroups).filter(
        (target) =>
          APPLICATION_DEFINITION_KINDS.has(target.kind) && !target.description?.trim()
      )
      if (missing.length === 0) continue

      findings.push(
        makeFinding(
          missingTargetDescriptionRule,
          policy,
          `Policy has ${missing.length} application ${missing.length === 1 ? "definition" : "definitions"} without a description.`,
          {
            evidence: { missingDescriptions: missing.length },
            remediation:
              "Add a brief application description (product or solution name) to each managed application definition.",
          }
        )
      )
    }

    return findings
  },
}
