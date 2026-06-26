import type {
  ApplicationGroupEntry,
  GuiDialog,
  IntelligenceReport,
  PolicyDocument,
  PolicyEntry,
} from "../types"
import { policyHasCustomizedContent } from "./appGroups"

export const countCustomizedPolicies = (
  policies: PolicyEntry[],
  applicationGroups: ApplicationGroupEntry[]
): number =>
  policies.filter((policy) =>
    policyHasCustomizedContent(policy, applicationGroups, true)
  ).length

export const countCustomizedDialogs = (dialogs: GuiDialog[]): number =>
  dialogs.filter((dialog) => !dialog.isDefault).length

export const countCustomizedAppGroups = (
  groups: ApplicationGroupEntry[]
): number => groups.filter((group) => !group.isDefault).length

export const countCustomizedIntelligenceFindings = (
  intelligence: IntelligenceReport,
  policies: PolicyEntry[],
  applicationGroups: ApplicationGroupEntry[]
): number => {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]))
  return intelligence.findings.filter((finding) => {
    const policy = policyById.get(finding.policyId)
    if (!policy) return true
    return policyHasCustomizedContent(policy, applicationGroups, true)
  }).length
}

export const intelligenceTabCount = (
  intelligence: IntelligenceReport,
  hideDefaults: boolean,
  allPolicies: PolicyEntry[],
  applicationGroups: ApplicationGroupEntry[]
): number | undefined => {
  const findings = hideDefaults
    ? countCustomizedIntelligenceFindings(
        intelligence,
        allPolicies,
        applicationGroups
      )
    : intelligence.findings.length

  if (findings === 0 && !hideDefaults) return undefined

  if (hideDefaults) return findings

  if (findings === 0) return undefined

  const actionable =
    intelligence.counts.critical + intelligence.counts.warning
  return actionable > 0 ? actionable : findings || undefined
}

export const tabCountsForDocument = (
  doc: PolicyDocument,
  hideDefaults: boolean
) => {
  const allPolicies = [
    ...doc.normalPolicies,
    ...doc.excludedPolicies,
    ...doc.threatProtectionPolicies,
  ]

  if (!hideDefaults) {
    return {
      intelligence: intelligenceTabCount(
        doc.intelligence,
        false,
        allPolicies,
        doc.applicationGroups
      ),
      normal: doc.normalPolicies.length,
      excluded: doc.excludedPolicies.length,
      threat: doc.threatProtectionPolicies.length || undefined,
      gui: doc.gui.length,
      appGroups: doc.applicationGroups.length || undefined,
      config: undefined as number | undefined,
    }
  }

  const normal = countCustomizedPolicies(doc.normalPolicies, doc.applicationGroups)
  const excluded = countCustomizedPolicies(
    doc.excludedPolicies,
    doc.applicationGroups
  )
  const threat =
    doc.threatProtectionPolicies.length > 0
      ? countCustomizedPolicies(
          doc.threatProtectionPolicies,
          doc.applicationGroups
        )
      : 0

  return {
    intelligence: intelligenceTabCount(
      doc.intelligence,
      true,
      allPolicies,
      doc.applicationGroups
    ),
    normal,
    excluded,
    threat: doc.threatProtectionPolicies.length > 0 ? threat : undefined,
    gui: countCustomizedDialogs(doc.gui),
    appGroups:
      doc.applicationGroups.length > 0
        ? countCustomizedAppGroups(doc.applicationGroups)
        : undefined,
    config: doc.summary.customizedConfigCount || undefined,
  }
}

export interface OverviewCounts {
  totalPolicies: number
  normal: number
  excluded: number
  threat: number
  defaultPolicies: number
  gui: number
  customizedSettings: number
  findings: number
  findingsAccent: boolean
}

export const overviewCountsForDocument = (
  doc: PolicyDocument,
  hideDefaults: boolean
): OverviewCounts => {
  if (!hideDefaults) {
    return {
      totalPolicies: doc.summary.totalPolicies,
      normal: doc.summary.normalCount,
      excluded: doc.summary.excludedCount,
      threat: doc.summary.threatProtectionCount,
      defaultPolicies: doc.summary.defaultPolicyCount,
      gui: doc.summary.guiCount,
      customizedSettings: doc.summary.customizedConfigCount,
      findings: doc.intelligence.findings.length,
      findingsAccent:
        doc.intelligence.counts.critical + doc.intelligence.counts.warning > 0,
    }
  }

  const tabCounts = tabCountsForDocument(doc, true)
  const normal = tabCounts.normal ?? 0
  const excluded = tabCounts.excluded ?? 0
  const threat = tabCounts.threat ?? 0

  return {
    totalPolicies: normal + excluded + threat,
    normal,
    excluded,
    threat,
    defaultPolicies: 0,
    gui: tabCounts.gui ?? 0,
    customizedSettings: doc.summary.customizedConfigCount,
    findings: tabCounts.intelligence ?? 0,
    findingsAccent: (tabCounts.intelligence ?? 0) > 0,
  }
}
