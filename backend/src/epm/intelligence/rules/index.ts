import { definitionLimitRule } from "./definitionLimit"
import { broadPublisherAuditRule } from "./broadPublisherAudit"
import { protectedAgentPathRule } from "./protectedAgentPaths"
import { duplicatePoliciesRule } from "./duplicatePolicies"
import { explorerInheritableChildProcsRule } from "./explorerInheritableChildProcs"
import type { PolicyRule } from "../types"

export const POLICY_RULES: PolicyRule[] = [
  definitionLimitRule,
  broadPublisherAuditRule,
  protectedAgentPathRule,
  explorerInheritableChildProcsRule,
  duplicatePoliciesRule,
]
