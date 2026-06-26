import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

export const implicitDefaultModifiedRule: PolicyRule = {
  id: "implicit-default-modified",
  title: "Default policy modified from baseline",
  description:
    "Checks implicit/default policies that have user-group targeting or customized application definitions compared to the baseline.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (!policy.implicit) continue

      const hasUserGroups = policy.userGroups.length > 0
      const hasCustomDefinitions = policy.customizedDefinitionCount > 0
      if (!hasUserGroups && !hasCustomDefinitions) continue

      const reasons = [
        ...(hasUserGroups ? ["user/group targeting"] : []),
        ...(hasCustomDefinitions
          ? [`${policy.customizedDefinitionCount} customized definition(s)`]
          : []),
      ].join(" and ")

      findings.push(
        makeFinding(
          implicitDefaultModifiedRule,
          policy,
          `Default policy "${policy.name}" differs from the out-of-the-box baseline (${reasons}).`,
          {
            evidence: {
              userGroups: policy.userGroups.length,
              customizedDefinitions: policy.customizedDefinitionCount,
            },
            remediation:
              "Review whether changes to default policies are intentional. Prefer custom policies over modifying implicit defaults.",
          }
        )
      )
    }

    return findings
  },
}
