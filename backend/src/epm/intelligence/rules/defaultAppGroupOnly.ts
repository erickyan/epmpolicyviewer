import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

export const defaultAppGroupOnlyRule: PolicyRule = {
  id: "default-app-group-only",
  title: "Policy references default application group only",
  description:
    "Checks custom policies whose targets are exclusively default/out-of-the-box application groups with no direct application definitions.",
  severity: "info",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm",
  evaluate: (ctx) => {
    const findings = []
    const groupById = new Map(ctx.applicationGroups.map((group) => [group.id, group]))

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || policy.targetCount === 0) continue

      const appGroupTargets = policy.targets.filter(
        (target) => target.kind === "ApplicationGroup"
      )
      if (appGroupTargets.length === 0) continue
      if (appGroupTargets.length !== policy.targets.length) continue

      const groupNames: string[] = []
      const allDefault = appGroupTargets.every((target) => {
        if (!target.refId) return false
        const group = groupById.get(target.refId)
        if (!group) return false
        groupNames.push(group.name)
        return group.isDefault
      })
      if (!allDefault) continue

      findings.push(
        makeFinding(
          defaultAppGroupOnlyRule,
          policy,
          `Policy targets only default application group${appGroupTargets.length === 1 ? "" : "s"} (${groupNames.join(", ")}).`,
          {
            evidence: {
              applicationGroups: groupNames.join(", "),
              groupCount: appGroupTargets.length,
            },
            remediation:
              "Group similar custom applications in dedicated application groups rather than relying solely on default groups.",
          }
        )
      )
    }

    return findings
  },
}
