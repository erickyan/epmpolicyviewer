import type { PolicyRule } from "../types"
import { makeFinding } from "../types"
import {
  collectAllTargets,
  isBroadOsPublisher,
  PUBLISHER_TARGET_KINDS,
  targetHasPublisher,
  targetIsPublisherOnly,
  targetPublisherValue,
} from "../helpers/targets"

export const broadPublisherAuditRule: PolicyRule = {
  id: "broad-publisher-audit",
  title: "Broad OS publisher with audit enabled",
  description:
    "Checks for policies with audit enabled where every publisher-bearing target is publisher-only and uses the broad OS signature (Software Signing on macOS, Microsoft Windows on Windows). Implicit policies are skipped.",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm",
  evaluate: (ctx) => {
    const findings = []

    for (const policy of ctx.allPolicies) {
      if (policy.implicit || !policy.auditEnabled || policy.targetCount === 0) continue

      const targets = collectAllTargets(policy, ctx.applicationGroups).filter(
        (target) => PUBLISHER_TARGET_KINDS.has(target.kind) && targetHasPublisher(target)
      )
      if (targets.length === 0) continue

      const publisherOnly = targets.filter((target) => targetIsPublisherOnly(target))
      if (publisherOnly.length === 0) continue

      const allBroad = publisherOnly.every((target) => {
        const publisher = targetPublisherValue(target)
        return !!publisher && isBroadOsPublisher(target, publisher)
      })
      if (!allBroad) continue

      const platforms = [...new Set(publisherOnly.map((target) => target.platform))].join(", ")
      const publishers = [
        ...new Set(
          publisherOnly
            .map((target) => targetPublisherValue(target))
            .filter((value): value is string => !!value)
        ),
      ].join(", ")

      findings.push(
        makeFinding(
          broadPublisherAuditRule,
          policy,
          `Policy matches only broad OS publisher signature${publisherOnly.length === 1 ? "" : "s"} (${publishers}) with audit enabled — this can generate excessive audit events.`,
          {
            evidence: {
              publisherTargets: publisherOnly.length,
              platforms,
              publishers,
            },
            remediation:
              "Disable audit for this policy, narrow the application definition (add location/filename/bundle constraints), or scope to specific users/groups.",
          }
        )
      )
    }

    return findings
  },
}
