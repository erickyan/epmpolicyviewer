import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

const DEFINITION_LIMIT = 1000

export const definitionLimitRule: PolicyRule = {
  id: "definition-limit",
  title: "Definition count exceeds EPM limit",
  description:
    "Each policy is limited to 1,000 application definitions. Split oversized policies into multiple policies.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm",
  evaluate: (ctx) => {
    const findings = []
    for (const policy of ctx.allPolicies) {
      if (policy.definitionCount <= DEFINITION_LIMIT) continue
      findings.push(
        makeFinding(
          definitionLimitRule,
          policy,
          `Policy has ${policy.definitionCount.toLocaleString()} definitions (limit is ${DEFINITION_LIMIT.toLocaleString()}).`,
          {
            evidence: {
              definitionCount: policy.definitionCount,
              limit: DEFINITION_LIMIT,
            },
            remediation:
              "Create multiple policies and distribute application definitions across them.",
          }
        )
      )
    }
    return findings
  },
}
