import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import { hasStandardPolicyName } from "../helpers/naming"

const SKIP_ACTIONS = new Set(["10", "13", "15", "16", "17", "24"])
const TRUSTED_PUBLISHER_TYPES = new Set(["1280", "1281", "221", "231", "244", "265", "281", "291"])

export const nonStandardPolicyNamingRule: PolicyRule = {
  id: "non-standard-policy-naming",
  title: "Non-standard policy name",
  description:
    "Checks custom policy names that do not follow the recommended [Bundle] – [Applications] – [Descriptor] convention or common category prefixes.",
  severity: "info",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || SKIP_ACTIONS.has(policy.action)) continue
      if (TRUSTED_PUBLISHER_TYPES.has(policy.internalType ?? "")) continue
      if (hasStandardPolicyName(policy.name)) continue
      if (policy.targetCount === 0 && !policy.endpointSignIn && !policy.lcdPolicy) {
        continue
      }

      findings.push(
        makeFinding(
          nonStandardPolicyNamingRule,
          policy,
          `Policy name "${policy.name}" does not follow the recommended naming convention.`,
          {
            remediation:
              "Rename using [Bundle] – [Applications] – [Descriptor] (for example [ENG] – Visual Studio – Elevate debug tools).",
          }
        )
      )
    }

    return findings
  },
}
