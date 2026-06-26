import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

const SKIP_ACTIONS = new Set(["10", "13", "15", "16", "17", "24"])

export const missingPolicyDescriptionRule: PolicyRule = {
  id: "missing-policy-description",
  title: "Missing policy description",
  description:
    "Checks custom policies that have no description documenting their purpose (CyberArk recommends initials and a timestamp).",
  severity: "info",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || SKIP_ACTIONS.has(policy.action)) continue
      if (policy.description?.trim()) continue
      if (policy.targetCount === 0 && !policy.endpointSignIn && !policy.lcdPolicy) {
        continue
      }

      findings.push(
        makeFinding(
          missingPolicyDescriptionRule,
          policy,
          `Policy "${policy.name}" has no description.`,
          {
            remediation:
              "Add a policy description explaining purpose, owner initials, and date for change tracking.",
          }
        )
      )
    }

    return findings
  },
}
