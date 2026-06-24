import type { ApplicationGroupEntry, GuiDialog, PolicyEntry, TargetEntry } from "../types"
import { resolveTargetMembers } from "./appGroups"

export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase()

const includes = (haystack: string | undefined, needle: string): boolean =>
  !!haystack && haystack.toLowerCase().includes(needle)

export const targetMatchesQuery = (
  target: TargetEntry,
  query: string,
  members?: TargetEntry[]
): boolean => {
  const nestedMembers = members ?? target.members ?? []
  return (
  includes(target.kind, query) ||
  includes(target.platform, query) ||
  includes(target.name, query) ||
  includes(target.publisher, query) ||
  includes(target.bundleId, query) ||
  includes(target.definitionSummary, query) ||
  includes(target.location, query) ||
  includes(target.fileName, query) ||
  includes(target.accessType, query) ||
  includes(target.serviceName, query) ||
  (target.fileVerInfo?.some(
    (info) => includes(info.name, query) || includes(info.value, query)
  ) ??
    false) ||
  nestedMembers.some((member) => targetMatchesQuery(member, query)) ||
  Object.entries(target.attributes).some(
    ([key, value]) => includes(key, query) || includes(value, query)
  )
  )
}

export const policyMatchesQuery = (
  policy: PolicyEntry,
  query: string,
  appGroups: ApplicationGroupEntry[] = []
): boolean => {
  if (!query) return true
  const auditText = policy.auditEnabled ? "audit" : "no audit"
  return (
    includes(policy.name, query) ||
    includes(policy.id, query) ||
    includes(policy.actionLabel, query) ||
    includes(policy.categoryLabel, query) ||
    includes(policy.internalTypeLabel, query) ||
    includes(policy.excludeType, query) ||
    includes(auditText, query) ||
    (policy.inheritableTargets > 0 &&
      (includes("inheritable", query) || includes("inheritance", query))) ||
    policy.userGroups.some(
      (group) =>
        includes(group.value, query) ||
        includes(group.kind, query) ||
        includes(group.scopeLabel, query)
    ) ||
    policy.scopes.some((scope) => includes(scope.label, query)) ||
    policy.linkedDialogs.some((dialog) => includes(dialog.name, query)) ||
    policy.targets.some((target) =>
      targetMatchesQuery(target, query, resolveTargetMembers(target, appGroups))
    ) ||
    includes("endpoint sign-in", query) ||
    includes(policy.endpointSignIn?.oidc?.name, query) ||
    includes(policy.endpointSignIn?.oidc?.configurationUrl, query) ||
    includes(policy.endpointSignIn?.oidc?.clientId, query) ||
    includes(policy.endpointSignIn?.oidc?.userDomain, query) ||
    includes(policy.endpointSignIn?.oidc?.scopes, query) ||
    includes(policy.endpointSignIn?.mappings?.userName, query) ||
    includes("lcd policy", query) ||
    includes("loosely connected", query) ||
    (policy.lcdPolicy?.pvwaAddresses.some((address) => includes(address, query)) ?? false) ||
    (policy.lcdPolicy?.localGroups.some(
      (group) => includes(group.name, query) || includes(group.sid, query)
    ) ?? false)
  )
}

export const dialogMatchesQuery = (
  dialog: GuiDialog,
  query: string
): boolean => {
  if (!query) return true
  return (
    includes(dialog.name, query) ||
    includes(dialog.typeLabel, query) ||
    includes(dialog.type, query) ||
    includes(dialog.os, query) ||
    dialog.usedBy.some((policy) => includes(policy.name, query))
  )
}
