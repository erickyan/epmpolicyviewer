import type {
  ApplicationGroupEntry,
  PolicyCategory,
  PolicyEntry,
} from "../../types"

export type IntelligenceSeverity = "critical" | "warning" | "info"

export interface PolicyFinding {
  ruleId: string
  severity: IntelligenceSeverity
  title: string
  message: string
  policyId: string
  policyName: string
  categoryLabel: string
  policyCategory: Exclude<PolicyCategory, "configuration">
  evidence?: Record<string, string | number>
  remediation?: string
  docUrl?: string
}

export interface IntelligenceCounts {
  critical: number
  warning: number
  info: number
}

export interface IntelligenceRuleInfo {
  id: string
  title: string
  description: string
  severity: IntelligenceSeverity
  docUrl?: string
  findingCount: number
}

export interface IntelligenceReport {
  findings: PolicyFinding[]
  counts: IntelligenceCounts
  rulesRun: number
  rules: IntelligenceRuleInfo[]
}

export interface RuleContext {
  normalPolicies: PolicyEntry[]
  excludedPolicies: PolicyEntry[]
  threatProtectionPolicies: PolicyEntry[]
  applicationGroups: ApplicationGroupEntry[]
  allPolicies: PolicyEntry[]
}

export interface PolicyRule {
  id: string
  title: string
  description: string
  severity: IntelligenceSeverity
  docUrl?: string
  evaluate: (ctx: RuleContext) => PolicyFinding[]
}

export const makeFinding = (
  rule: PolicyRule,
  policy: PolicyEntry,
  message: string,
  options?: {
    title?: string
    evidence?: Record<string, string | number>
    remediation?: string
    severity?: IntelligenceSeverity
  }
): PolicyFinding => ({
  ruleId: rule.id,
  severity: options?.severity ?? rule.severity,
  title: options?.title ?? rule.title,
  message,
  policyId: policy.id,
  policyName: policy.name,
  categoryLabel: policy.categoryLabel,
  policyCategory: policy.category as Exclude<PolicyCategory, "configuration">,
  evidence: options?.evidence,
  remediation: options?.remediation,
  docUrl: rule.docUrl,
})
