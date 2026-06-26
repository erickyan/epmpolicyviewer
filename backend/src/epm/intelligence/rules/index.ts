import { definitionLimitRule } from "./definitionLimit"
import { broadPublisherAuditRule } from "./broadPublisherAudit"
import { protectedAgentPathRule } from "./protectedAgentPaths"
import { protectedOsFolderRule } from "./protectedOsFolders"
import { duplicatePoliciesRule } from "./duplicatePolicies"
import { explorerInheritableChildProcsRule } from "./explorerInheritableChildProcs"
import { checksumOnlyMatchRule } from "./checksumOnlyMatch"
import { blockChecksumOnlyRule } from "./blockChecksumOnly"
import { broadLocationOnlyRule } from "./broadLocationOnly"
import { publisherOnlyAuditRule } from "./publisherOnlyAudit"
import { missingPolicyDescriptionRule } from "./missingPolicyDescription"
import { missingTargetDescriptionRule } from "./missingTargetDescription"
import { nonStandardPolicyNamingRule } from "./nonStandardPolicyNaming"
import { implicitDefaultModifiedRule } from "./implicitDefaultModified"
import { defaultAppGroupOnlyRule } from "./defaultAppGroupOnly"
import { linuxBroadCommandRule } from "./linuxBroadCommand"
import type { PolicyRule } from "../types"

export const POLICY_RULES: PolicyRule[] = [
  definitionLimitRule,
  broadPublisherAuditRule,
  publisherOnlyAuditRule,
  protectedAgentPathRule,
  protectedOsFolderRule,
  explorerInheritableChildProcsRule,
  checksumOnlyMatchRule,
  blockChecksumOnlyRule,
  broadLocationOnlyRule,
  implicitDefaultModifiedRule,
  duplicatePoliciesRule,
  missingPolicyDescriptionRule,
  missingTargetDescriptionRule,
  nonStandardPolicyNamingRule,
  defaultAppGroupOnlyRule,
  linuxBroadCommandRule,
]
