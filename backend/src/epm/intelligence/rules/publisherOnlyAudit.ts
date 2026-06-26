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

export const publisherOnlyAuditRule: PolicyRule = {
  id: "publisher-only-audit",
  title: "Publisher-only match with audit enabled",
  description:
    "Checks for policies with audit enabled where every publisher-bearing target is publisher-only and does not use the broad OS signature (Software Signing / Microsoft Windows).",
  severity: "warning",
  docUrl:
    "https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm",
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

      const allBroadOs = publisherOnly.every((target) => {
        const publisher = targetPublisherValue(target)
        return !!publisher && isBroadOsPublisher(target, publisher)
      })
      if (allBroadOs) continue

      const publishers = [
        ...new Set(
          publisherOnly
            .map((target) => targetPublisherValue(target))
            .filter((value): value is string => !!value)
        ),
      ].join(", ")

      findings.push(
        makeFinding(
          publisherOnlyAuditRule,
          policy,
          `Policy matches only publisher signature${publisherOnly.length === 1 ? "" : "s"} (${publishers}) with audit enabled — add path or filename constraints to reduce audit noise.`,
          {
            evidence: {
              publisherTargets: publisherOnly.length,
              publishers,
            },
            remediation:
              "Disable audit, or narrow definitions with location/filename/bundle constraints in addition to the publisher.",
          }
        )
      )
    }

    return findings
  },
}
