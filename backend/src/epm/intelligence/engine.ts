import type { ApplicationGroupEntry, PolicyEntry } from "../../types"
import { POLICY_RULES } from "./rules"
import type {
  IntelligenceCounts,
  IntelligenceReport,
  RuleContext,
} from "./types"

export type { PolicyFinding, IntelligenceReport, PolicyRule } from "./types"

const emptyCounts = (): IntelligenceCounts => ({
  critical: 0,
  warning: 0,
  info: 0,
})

const countBySeverity = (findings: ReturnType<(typeof POLICY_RULES)[0]["evaluate"]>): IntelligenceCounts => {
  const counts = emptyCounts()
  for (const finding of findings) {
    counts[finding.severity] += 1
  }
  return counts
}

export const buildRuleContext = (input: {
  normalPolicies: PolicyEntry[]
  excludedPolicies: PolicyEntry[]
  threatProtectionPolicies: PolicyEntry[]
  applicationGroups: ApplicationGroupEntry[]
}): RuleContext => ({
  ...input,
  allPolicies: [
    ...input.normalPolicies,
    ...input.excludedPolicies,
    ...input.threatProtectionPolicies,
  ],
})

export const runPolicyIntelligence = (input: {
  normalPolicies: PolicyEntry[]
  excludedPolicies: PolicyEntry[]
  threatProtectionPolicies: PolicyEntry[]
  applicationGroups: ApplicationGroupEntry[]
}): IntelligenceReport => {
  const ctx = buildRuleContext(input)
  const findings = POLICY_RULES.flatMap((rule) => rule.evaluate(ctx))

  return {
    findings,
    counts: countBySeverity(findings),
    rulesRun: POLICY_RULES.length,
  }
}

export const attachFindingsToPolicies = (
  policies: PolicyEntry[],
  findings: IntelligenceReport["findings"]
): void => {
  const byPolicy = new Map<string, typeof findings>()
  for (const finding of findings) {
    const list = byPolicy.get(finding.policyId) ?? []
    list.push(finding)
    byPolicy.set(finding.policyId, list)
  }

  for (const policy of policies) {
    const policyFindings = byPolicy.get(policy.id)
    if (policyFindings?.length) {
      policy.findings = policyFindings
    }
  }
}

export const buildDuplicateSummaryFromFindings = (
  findings: IntelligenceReport["findings"]
): {
  duplicateGroups: Array<{
    reason: string
    policies: Array<{
      id: string
      name: string
      categoryLabel: string
      order: string
    }>
  }>
  duplicatePolicyCount: number
} => {
  const duplicateFindings = findings.filter(
    (finding) => finding.ruleId === "duplicate-policies"
  )
  if (duplicateFindings.length === 0) {
    return { duplicateGroups: [], duplicatePolicyCount: 0 }
  }

  const groupsByKey = new Map<
    string,
    { reason: string; policies: Map<string, (typeof duplicateFindings)[0]> }
  >()

  for (const finding of duplicateFindings) {
    const groupKey = String(finding.evidence?.duplicateGroupKey ?? finding.policyId)
    const reason =
      finding.title.includes("name")
        ? "Duplicate name"
        : "Same action, targets & user targeting"
    const bucket =
      groupsByKey.get(groupKey) ?? { reason, policies: new Map<string, typeof finding>() }
    bucket.policies.set(finding.policyId, finding)
    groupsByKey.set(groupKey, bucket)
  }

  const duplicateGroups = [...groupsByKey.values()].map((group) => ({
    reason: group.reason,
    policies: [...group.policies.values()].map((finding) => ({
      id: finding.policyId,
      name: finding.policyName,
      categoryLabel: finding.categoryLabel,
      order: "",
    })),
  }))

  return {
    duplicateGroups,
    duplicatePolicyCount: duplicateFindings.length,
  }
}

// Preserve order on duplicate summary policies
export const buildDuplicateSummaryFromFindingsWithPolicies = (
  findings: IntelligenceReport["findings"],
  allPolicies: PolicyEntry[]
): ReturnType<typeof buildDuplicateSummaryFromFindings> => {
  const orderById = new Map(allPolicies.map((policy) => [policy.id, policy.order]))
  const base = buildDuplicateSummaryFromFindings(findings)
  return {
    duplicatePolicyCount: base.duplicatePolicyCount,
    duplicateGroups: base.duplicateGroups.map((group) => ({
      ...group,
      policies: group.policies.map((policy) => ({
        ...policy,
        order: orderById.get(policy.id) ?? policy.order,
      })),
    })),
  }
}
