import { XMLParser } from "fast-xml-parser"
import type {
  AlertEntry,
  ApplicationGroupEntry,
  ApplicationGroupUser,
  CategoryCount,
  ConfigGroup,
  ConfigItem,
  DialogUser,
  DocumentSummary,
  DuplicateGroup,
  DuplicatePolicy,
  EndpointSignInConfig,
  FileVerInfoEntry,
  GeneralConfiguration,
  GuiDialog,
  LinkedDialog,
  MessageEntry,
  PolicyCategory,
  PolicyDocument,
  PolicyEntry,
  PolicyScope,
  PolicyScopeId,
  TargetEntry,
  UserGroupEntry,
} from "../types"
import {
  CONFIGURATION_ACTIONS,
  EXCLUDE_ACTIONS,
  THREAT_PROTECTION_ACTIONS,
  getActionLabel,
  getAdminTaskLabel,
  getDialogTypeLabel,
  getInternalTypeLabel,
  getPolicyCategory,
  isDefaultPolicy,
} from "./labels"
import { CONFIG_GROUP_SPECS } from "./configGroups"

// Per EPM domain rules + the format spec, attributes hold the metadata and must
// be preserved. Entity limits are raised because real exports contain thousands
// of escaped entities (see policyParser history).
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: {
    maxTotalExpansions: 5_000_000,
    maxExpandedLength: 50_000_000,
    maxEntitySize: 5_000_000,
    maxEntityCount: 100_000,
  },
})

type XmlNode = Record<string, unknown>

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const getText = (node: unknown): string | undefined => {
  if (node === undefined || node === null) return undefined
  if (Array.isArray(node)) {
    const parts = node.map(getText).filter((v): v is string => v !== undefined)
    return parts.length ? parts.join(", ") : undefined
  }
  if (typeof node === "object") {
    const record = node as XmlNode
    if ("#text" in record) return String(record["#text"])
    return undefined
  }
  const text = String(node)
  return text
}

const attr = (node: XmlNode, name: string): string | undefined => {
  const value = node[`@_${name}`]
  return value === undefined || value === null ? undefined : String(value)
}

const getByPath = (root: unknown, path: string): string | undefined => {
  const segments = path.split(".")
  let current: unknown = root
  for (const segment of segments) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined
    }
    current = (current as XmlNode)[segment]
  }
  return getText(current)
}

const platformForKind = (kind: string): TargetEntry["platform"] => {
  if (kind === "ApplicationGroup") return "Any"
  if (kind.startsWith("Mac")) return "macOS"
  if (kind.startsWith("Linux")) return "Linux"
  return "Windows"
}

const TARGET_RESERVED_ATTRS = new Set([
  "targetId",
  "softwareDistributorName",
  "name",
  "id",
  "inheritable",
  "childProcs",
])

type AppGroupIndex = Map<string, { name?: string; targets: TargetEntry[] }>

const buildFileVerInfo = (entry: XmlNode): FileVerInfoEntry[] | undefined => {
  const infos = asArray(entry.FileVerInfo as XmlNode | XmlNode[])
    .map((node) => ({
      name: attr(node as XmlNode, "name") ?? "",
      value: getText(node) ?? "",
    }))
    .filter((info) => info.name || info.value)
  return infos.length ? infos : undefined
}

const buildTargets = (
  targetsNode: unknown,
  appGroups?: AppGroupIndex
): TargetEntry[] => {
  if (!targetsNode || typeof targetsNode !== "object") return []
  const record = targetsNode as XmlNode
  const targets: TargetEntry[] = []

  for (const [kind, rawValue] of Object.entries(record)) {
    if (kind.startsWith("@_") || kind === "#text") continue

    for (const rawEntry of asArray(rawValue)) {
      const entry = (typeof rawEntry === "object" && rawEntry !== null
        ? rawEntry
        : {}) as XmlNode

      const attributes: Record<string, string> = {}
      for (const [key, value] of Object.entries(entry)) {
        if (!key.startsWith("@_")) continue
        const cleanKey = key.slice(2)
        if (TARGET_RESERVED_ATTRS.has(cleanKey)) continue
        attributes[cleanKey] = String(value)
      }

      // Some "installed by" targets nest the publisher under FileOrigin/Package.
      const nestedPublisher = getText(
        ((entry.FileOrigin as XmlNode | undefined)?.Package as XmlNode | undefined)
          ?.Publisher
      )

      const refId = attr(entry, "id")
      const groupDef =
        kind === "ApplicationGroup" && refId ? appGroups?.get(refId) : undefined
      const adminTaskName =
        kind === "AdminTask" || kind === "MacAdminTask"
          ? getAdminTaskLabel(kind, refId)
          : undefined

      targets.push({
        kind,
        platform: platformForKind(kind),
        name:
          adminTaskName ??
          attr(entry, "softwareDistributorName") ??
          (attr(entry, "name") || undefined) ??
          groupDef?.name,
        publisher: getText(entry.Publisher) ?? nestedPublisher,
        location: getText(entry.Location),
        fileName: getText(entry.FileName),
        accessType: getText(entry.Type),
        targetId: attr(entry, "targetId"),
        refId,
        inheritable: (attr(entry, "inheritable") ?? "").toLowerCase() === "true",
        childProcs: attr(entry, "childProcs"),
        serviceName: getText(entry.SvcName),
        fileVerInfo: buildFileVerInfo(entry),
        memberCount: groupDef?.targets.length,
        attributes,
      })
    }
  }

  return targets
}

// Application definitions targeted by a policy. Each non-group target counts as 1;
// ApplicationGroup targets contribute their member count (resolved from the root index).
const countPolicyDefinitions = (targets: TargetEntry[]): number =>
  targets.reduce((sum, target) => {
    if (target.kind === "ApplicationGroup") return sum + (target.memberCount ?? 0)
    return sum + 1
  }, 0)

// The directory source ("scope") a user/group principal comes from, inferred from
// the <UserGroupList> child element name (e.g. IdpGroup, AzGroup, User).
const scopeForKind = (kind: string): { id: PolicyScopeId; label: string } => {
  if (/^idp/i.test(kind)) return { id: "idp", label: "IdP" }
  if (/^(az|azure|aad|entra)/i.test(kind))
    return { id: "azure", label: "Azure AD" }
  if (/^(user|group|domain)/i.test(kind))
    return { id: "domain", label: "Domain" }
  return { id: "other", label: kind }
}

// "Specific targeting": the users/groups a policy applies to. Appears as a direct
// <UserGroupList> on the policy, and nested under <AllowedLocalAdministrators> for
// Remove-Local-Admin-Rights policies.
const parseUserGroupList = (node: unknown): UserGroupEntry[] => {
  if (!node || typeof node !== "object") return []
  const record = node as XmlNode
  const entries: UserGroupEntry[] = []

  for (const [kind, rawValue] of Object.entries(record)) {
    if (kind.startsWith("@_") || kind === "#text") continue
    const scope = scopeForKind(kind)
    for (const item of asArray(rawValue)) {
      const value = getText(item)
      if (value === undefined || value === "") continue
      const accountType =
        typeof item === "object" && item !== null
          ? attr(item as XmlNode, "accountType")
          : undefined
      entries.push({
        kind,
        value,
        accountType,
        scopeId: scope.id,
        scopeLabel: scope.label,
      })
    }
  }

  return entries
}

// Distinct directory sources across a policy's user/group scope, ordered.
const collectScopes = (userGroups: UserGroupEntry[]): PolicyScope[] => {
  const seen = new Map<PolicyScopeId, string>()
  for (const group of userGroups) {
    if (!seen.has(group.scopeId)) seen.set(group.scopeId, group.scopeLabel)
  }
  return Array.from(seen, ([id, label]) => ({ id, label }))
}

const collectUserGroups = (policy: XmlNode): UserGroupEntry[] => {
  const lists: unknown[] = [policy.UserGroupList]
  const allowedAdmins = policy.AllowedLocalAdministrators as XmlNode | undefined
  if (allowedAdmins) lists.push(allowedAdmins.UserGroupList)
  return lists.flatMap(parseUserGroupList)
}

const collectAlerts = (policy: XmlNode): AlertEntry[] =>
  asArray(policy.Alert as XmlNode | XmlNode[]).map((alertNode) => ({
    id: attr(alertNode, "id"),
    trigger: attr(alertNode, "trigger"),
    type: attr(alertNode, "type"),
    ostype: attr(alertNode, "ostype"),
  }))

const buildGeneralConfiguration = (
  policy: XmlNode,
  baseline?: Record<string, string>
): GeneralConfiguration => {
  const configurationNode = policy.Configuration

  const groups: ConfigGroup[] = []
  let customizedCount = 0
  for (const spec of CONFIG_GROUP_SPECS) {
    const items: ConfigItem[] = []
    for (const field of spec.fields) {
      const value = getByPath(configurationNode, field.path)
      if (value === undefined) continue

      const defaultValue = baseline ? baseline[field.path] : undefined
      // Only flag as customized when we have a baseline value to compare against.
      const customized = baseline
        ? defaultValue !== undefined && defaultValue !== value
        : undefined
      if (customized) customizedCount += 1

      items.push({
        label: field.label,
        value,
        path: field.path,
        defaultValue,
        customized,
        group: spec.title,
      })
    }

    if (items.length) groups.push({ title: spec.title, items })
  }

  const alerts: AlertEntry[] = collectAlerts(policy)

  const messagesContainer = policy.Messages as XmlNode | undefined
  const messages: MessageEntry[] = asArray(
    messagesContainer?.Message as XmlNode | XmlNode[]
  )
    .map((messageNode) => ({
      id: attr(messageNode, "id") ?? "",
      value: getText(messageNode) ?? "",
    }))
    .filter((message) => message.id !== "")

  return {
    policyId: attr(policy, "id") ?? "",
    policyName: attr(policy, "name") ?? "",
    order: attr(policy, "order") ?? "",
    groups,
    alerts,
    messages,
    customizedCount,
  }
}

const resolveLinkedDialogs = (
  policy: XmlNode,
  dialogIndex: Map<string, GuiDialog>
): LinkedDialog[] => {
  const linked: LinkedDialog[] = []
  const seen = new Set<string>()
  for (const alert of collectAlerts(policy)) {
    if (!alert.id || seen.has(alert.id)) continue
    const dialog = dialogIndex.get(alert.id)
    if (!dialog) continue
    seen.add(alert.id)
    linked.push({
      id: dialog.id,
      name: dialog.name,
      type: dialog.type,
      typeLabel: dialog.typeLabel,
      trigger: alert.trigger,
    })
  }
  return linked
}

const parseBoolText = (value?: string): boolean | undefined => {
  if (value === undefined || value === "") return undefined
  return value.toLowerCase() === "true"
}

// Action 24 — Endpoint sign-in. Windows/macOS use <OIDCConfig> + <Mappings> +
// <FallbackOptions>; Linux Identity Bridge uses <IDP> (parsed as variant only for now).
const buildEndpointSignIn = (policy: XmlNode): EndpointSignInConfig | undefined => {
  const oidcNode = policy.OIDCConfig as XmlNode | undefined
  const mappingsNode = policy.Mappings as XmlNode | undefined
  const fallbackNode = policy.FallbackOptions as XmlNode | undefined
  const idpNode = policy.IDP as XmlNode | undefined

  if (!oidcNode && !idpNode) return undefined

  const fidoNode = fallbackNode?.FIDO2SecurityKey as XmlNode | undefined

  return {
    variant: oidcNode ? "windows" : "linux",
    oidc: oidcNode
      ? {
          name: getText(oidcNode.Name),
          configurationUrl: getText(oidcNode.ConfigurationURL),
          clientId: getText(oidcNode.ClientID),
          redirectUri: getText(oidcNode.RedirectURI),
          userDomain: getText(oidcNode.UserDomain),
          scopes: getText(oidcNode.Scopes),
        }
      : undefined,
    mappings: mappingsNode
      ? {
          userName: getText(mappingsNode.UserName),
          firstName: getText(mappingsNode.FirstName),
          lastName: getText(mappingsNode.LastName),
          autoFillUserName: getText(mappingsNode.AutoFillUserName),
        }
      : undefined,
    fallback: fallbackNode
      ? {
          allowTotp: parseBoolText(getText(fallbackNode.allowTOTP)),
          allowLocalLogin: parseBoolText(getText(fallbackNode.allowLocalLogin)),
          requireUserPin: parseBoolText(getText(fallbackNode.RequireUserPin)),
          fido2Enabled: parseBoolText(getText(fidoNode?.IsEnabled)),
          fido2EnforcePin: parseBoolText(getText(fidoNode?.EnforcePIN)),
        }
      : undefined,
  }
}

const buildPolicyEntry = (
  policy: XmlNode,
  category: Exclude<PolicyCategory, "configuration">,
  dialogIndex: Map<string, GuiDialog>,
  appGroups: AppGroupIndex,
  consoleDefaults?: ConsoleDefaults
): PolicyEntry => {
  const action = attr(policy, "action") ?? ""
  const internalType = attr(policy, "internalType")
  const name = attr(policy, "name") ?? ""
  const excludeType = attr(policy, "excludeType")
  const targets = buildTargets(policy.Targets, appGroups)
  const reportUsage = attr(policy, "reportUsage")
  const userGroups = collectUserGroups(policy)

  // A console "default configuration" scaffold policy: its name matches a default
  // policy name AND it targets a default application group (avoids flagging a
  // customer policy that merely shares a generic name like "Block").
  const referencesDefaultAppGroup = targets.some(
    (target) =>
      target.kind === "ApplicationGroup" &&
      !!target.name &&
      (consoleDefaults?.appGroupNames.has(target.name.trim().toLowerCase()) ??
        false)
  )
  const isConsoleDefaultPolicy =
    (consoleDefaults?.policyNames.has(name.trim().toLowerCase()) ?? false) &&
    referencesDefaultAppGroup

  const implicit =
    isDefaultPolicy({
      action,
      implicit: attr(policy, "implicit"),
      internalDefaultPolicyModeAC: attr(policy, "internalDefaultPolicyModeAC"),
      name,
      internalType,
    }) || isConsoleDefaultPolicy

  const categoryInfo = isConsoleDefaultPolicy
    ? { id: "default", label: "Default Policy" }
    : getPolicyCategory({
        action,
        implicit: attr(policy, "implicit"),
        internalDefaultPolicyModeAC: attr(policy, "internalDefaultPolicyModeAC"),
        excludeType,
        name,
        internalType,
      })

  return {
    id: attr(policy, "id") ?? "",
    name,
    action,
    actionLabel: getActionLabel(action),
    order: attr(policy, "order") ?? "",
    category,
    categoryId: categoryInfo.id,
    categoryLabel: categoryInfo.label,
    implicit,
    excludeType,
    internalType,
    internalTypeLabel: getInternalTypeLabel(internalType),
    serverPolicyId: attr(policy, "serverPolicyId"),
    winMav: attr(policy, "winMav"),
    macMav: attr(policy, "macMav"),
    auditEnabled: reportUsage !== "2",
    reportUsage,
    targetCount: targets.length,
    definitionCount: countPolicyDefinitions(targets),
    inheritableTargets: targets.filter((t) => t.inheritable).length,
    targets,
    userGroups,
    scopes: collectScopes(userGroups),
    linkedDialogs: resolveLinkedDialogs(policy, dialogIndex),
    endpointSignIn:
      action === "24" ? buildEndpointSignIn(policy) : undefined,
  }
}

const detectOs = (sourceHtml: string): GuiDialog["os"] => {
  if (sourceHtml.includes("VfWinCss")) return "Windows"
  if (sourceHtml.includes("VfMacCss")) return "macOS"
  return "Any"
}

const buildGui = (guiNode: unknown): GuiDialog[] => {
  if (!guiNode || typeof guiNode !== "object") return []
  const record = guiNode as XmlNode

  const commonCode = new Map<string, string>()
  for (const node of asArray(record.CommonCode as XmlNode | XmlNode[])) {
    const id = attr(node, "id")
    const content = getText(node)
    if (id && content !== undefined) commonCode.set(id, content)
  }

  return asArray(record.Dialog as XmlNode | XmlNode[]).map((dialog) => {
    const sourceHtml = getText(dialog) ?? ""

    // Inline the referenced shared CSS/JS so the preview renders styled.
    let html = sourceHtml
    for (const [id, content] of commonCode) {
      if (html.includes(id)) html = html.split(id).join(content)
    }

    const type = attr(dialog, "type")
    return {
      id: attr(dialog, "id") ?? "",
      name: attr(dialog, "name") ?? "Dialog",
      type,
      typeLabel: getDialogTypeLabel(type),
      os: detectOs(sourceHtml),
      isDefault: (attr(dialog, "isDefault") ?? "").toLowerCase() === "true",
      html,
      sourceHtml,
      usedBy: [],
    }
  })
}

const byOrder = (a: PolicyEntry, b: PolicyEntry): number => {
  const diff = Number(a.order) - Number(b.order)
  return Number.isNaN(diff) ? 0 : diff
}

// Extract a path -> value map of curated Configuration fields from the first
// action-10 policy. Used to compute "customized vs. default" comparisons.
export const extractConfigBaseline = (xml: string): Record<string, string> => {
  const trimmed = xml.replace(/^\uFEFF/, "").trim()
  const parsed = parser.parse(trimmed) as XmlNode
  const root = (parsed.Policies ?? {}) as XmlNode
  const policies = asArray(root.Policy as XmlNode | XmlNode[])
  const configNode = policies.find((p) => (attr(p, "action") ?? "") === "10")
    ?.Configuration

  const baseline: Record<string, string> = {}
  for (const spec of CONFIG_GROUP_SPECS) {
    for (const field of spec.fields) {
      const value = getByPath(configNode, field.path)
      if (value !== undefined) baseline[field.path] = value
    }
  }
  return baseline
}

export interface ConsoleDefaults {
  appGroupNames: Set<string>
  policyNames: Set<string>
}

// Parse an EPM console JSON export ("default configuration") to collect the names
// of default application groups and default policies. These are the authoritative
// baseline used to flag default app groups / scaffold policies. The console export
// uses a .xml extension but is actually JSON: { Policies:[{Name,PolicyType,…}],
// AppGroups:[{Name,…}] }, where PolicyType 14 = application group.
export const extractConsoleDefaults = (jsonText: string): ConsoleDefaults => {
  const appGroupNames = new Set<string>()
  const policyNames = new Set<string>()
  const add = (set: Set<string>, name: unknown): void => {
    if (typeof name === "string" && name.trim())
      set.add(name.trim().toLowerCase())
  }
  try {
    const data = JSON.parse(jsonText.replace(/^\uFEFF/, "")) as {
      Policies?: { Name?: string; PolicyType?: number }[]
      AppGroups?: { Name?: string }[]
    }
    for (const item of data.Policies ?? []) {
      if (item.PolicyType === 14) add(appGroupNames, item.Name)
      else add(policyNames, item.Name)
    }
    for (const group of data.AppGroups ?? []) add(appGroupNames, group.Name)
  } catch {
    // Not JSON / unexpected shape — return whatever was collected.
  }
  return { appGroupNames, policyNames }
}

const targetSignature = (policy: PolicyEntry): string =>
  policy.targets
    .map((t) =>
      [
        t.kind,
        t.platform,
        t.publisher ?? "",
        t.location ?? "",
        t.fileName ?? "",
        t.accessType ?? "",
        t.name ?? "",
        t.refId ?? "",
      ]
        .join("~")
        .toLowerCase()
    )
    .sort()
    .join("|")

const toDuplicatePolicy = (policy: PolicyEntry): DuplicatePolicy => ({
  id: policy.id,
  name: policy.name,
  categoryLabel: policy.categoryLabel,
  order: policy.order,
})

// internalType values of the "installed by" half of a main/installed-by pair.
const INSTALLED_BY_INTERNAL_TYPES = new Set([
  "221", "231", "244", "265", "281", "291", "1281",
])

// A "main + installed-by" pair is by design (the companion matches files installed
// BY the trusted app), not a duplicate. These are excluded from duplicate detection.
const isInstalledByCompanion = (policy: PolicyEntry): boolean =>
  /^installed by:/i.test(policy.name.trim()) ||
  INSTALLED_BY_INTERNAL_TYPES.has(policy.internalType ?? "")

// Best-effort duplicate detection: policies with identical action + targets, or
// sharing an identical name. Name groups already covered by a content group are skipped.
// Default/implicit baseline policies and installed-by companions are excluded because
// their parallel structures are by design rather than admin-introduced redundancy.
const buildDuplicateGroups = (entries: PolicyEntry[]): DuplicateGroup[] => {
  const groups: DuplicateGroup[] = []
  const seenIdSets = new Set<string>()

  const candidates = entries.filter(
    (entry) => !entry.implicit && !isInstalledByCompanion(entry)
  )

  const byContent = new Map<string, PolicyEntry[]>()
  for (const entry of candidates) {
    if (entry.targetCount === 0) continue
    const signature = `${entry.action}|${targetSignature(entry)}`
    const list = byContent.get(signature) ?? []
    list.push(entry)
    byContent.set(signature, list)
  }
  for (const list of byContent.values()) {
    if (list.length < 2) continue
    seenIdSets.add(list.map((e) => e.id).sort().join(","))
    groups.push({
      reason: "Same action & identical targets",
      policies: list.map(toDuplicatePolicy),
    })
  }

  const byName = new Map<string, PolicyEntry[]>()
  for (const entry of candidates) {
    const key = entry.name.trim().toLowerCase()
    if (!key) continue
    const list = byName.get(key) ?? []
    list.push(entry)
    byName.set(key, list)
  }
  for (const list of byName.values()) {
    if (list.length < 2) continue
    const idKey = list.map((e) => e.id).sort().join(",")
    if (seenIdSets.has(idKey)) continue
    seenIdSets.add(idKey)
    groups.push({
      reason: "Duplicate name",
      policies: list.map(toDuplicatePolicy),
    })
  }

  return groups
}

interface ParseOptions {
  baseline?: Record<string, string>
  consoleDefaults?: ConsoleDefaults
}

export const parsePolicyDocument = (
  xml: string,
  options: ParseOptions = {}
): PolicyDocument => {
  const trimmed = xml.replace(/^\uFEFF/, "").trim()
  const parsed = parser.parse(trimmed) as XmlNode
  const root = (parsed.Policies ?? {}) as XmlNode

  const policies = asArray(root.Policy as XmlNode | XmlNode[])

  // GUI is parsed first so policies can resolve their linked dialogs by id.
  const gui = buildGui(root.GUI)
  const dialogIndex = new Map<string, GuiDialog>()
  for (const dialog of gui) {
    if (dialog.id) dialogIndex.set(dialog.id, dialog)
  }

  // Root <ApplicationGroups> definitions, so policies that target an application
  // group by id can resolve its name and member applications.
  const appGroupIndex: AppGroupIndex = new Map()
  for (const def of asArray(
    (root.ApplicationGroups as XmlNode | undefined)?.ApplicationGroup as
      | XmlNode
      | XmlNode[]
  )) {
    const id = attr(def, "id")
    if (!id) continue
    appGroupIndex.set(id, {
      name: attr(def, "name") || undefined,
      targets: buildTargets(def),
    })
  }

  // Reverse map: which policies reference each dialog (via Alert.id === Dialog.id).
  const usedByMap = new Map<string, DialogUser[]>()
  const registerUsage = (policy: XmlNode): void => {
    const policyId = attr(policy, "id") ?? ""
    const policyName = attr(policy, "name") ?? ""
    const seen = new Set<string>()
    for (const alert of collectAlerts(policy)) {
      if (!alert.id || !dialogIndex.has(alert.id) || seen.has(alert.id)) continue
      seen.add(alert.id)
      const list = usedByMap.get(alert.id) ?? []
      list.push({ id: policyId, name: policyName })
      usedByMap.set(alert.id, list)
    }
  }

  let generalConfiguration: GeneralConfiguration | null = null
  const normalPolicies: PolicyEntry[] = []
  const excludedPolicies: PolicyEntry[] = []
  const threatProtectionPolicies: PolicyEntry[] = []

  for (const policy of policies) {
    registerUsage(policy)
    const action = attr(policy, "action") ?? ""
    if (CONFIGURATION_ACTIONS.has(action)) {
      // Use the first configuration policy as the General configuration.
      if (!generalConfiguration)
        generalConfiguration = buildGeneralConfiguration(policy, options.baseline)
      continue
    }
    if (THREAT_PROTECTION_ACTIONS.has(action)) {
      threatProtectionPolicies.push(
        buildPolicyEntry(
          policy,
          "threat-protection",
          dialogIndex,
          appGroupIndex,
          options.consoleDefaults
        )
      )
      continue
    }
    if (EXCLUDE_ACTIONS.has(action)) {
      excludedPolicies.push(
        buildPolicyEntry(
          policy,
          "excluded",
          dialogIndex,
          appGroupIndex,
          options.consoleDefaults
        )
      )
      continue
    }
    normalPolicies.push(
      buildPolicyEntry(
        policy,
        "normal",
        dialogIndex,
        appGroupIndex,
        options.consoleDefaults
      )
    )
  }

  normalPolicies.sort(byOrder)
  excludedPolicies.sort(byOrder)
  threatProtectionPolicies.sort(byOrder)

  for (const dialog of gui) {
    dialog.usedBy = usedByMap.get(dialog.id) ?? []
  }

  const allEntries = [
    ...normalPolicies,
    ...excludedPolicies,
    ...threatProtectionPolicies,
  ]

  // Reverse map: which policies reference each ApplicationGroup (target.refId).
  const appGroupUsage = new Map<string, ApplicationGroupUser[]>()
  for (const entry of allEntries) {
    const seen = new Set<string>()
    for (const target of entry.targets) {
      if (target.kind !== "ApplicationGroup" || !target.refId) continue
      if (seen.has(target.refId)) continue
      seen.add(target.refId)
      const list = appGroupUsage.get(target.refId) ?? []
      list.push({ id: entry.id, name: entry.name })
      appGroupUsage.set(target.refId, list)
    }
  }

  const implicitPolicyIds = new Set(
    allEntries.filter((entry) => entry.implicit).map((entry) => entry.id)
  )

  const applicationGroups: ApplicationGroupEntry[] = Array.from(
    appGroupIndex,
    ([id, def]) => {
      const platforms = new Set(
        def.targets
          .map((target) => target.platform)
          .filter((platform) => platform !== "Any")
      )
      const platform =
        platforms.size === 1
          ? (platforms.values().next().value as ApplicationGroupEntry["platform"])
          : "Any"
      const name = def.name ?? id
      const usedBy = appGroupUsage.get(id) ?? []
      // Predefined/baseline groups: named in the console default-config export, OR
      // bracketed default names ("[…]"), OR referenced only by default policies.
      const isDefault =
        (options.consoleDefaults?.appGroupNames.has(name.trim().toLowerCase()) ??
          false) ||
        /^\[.*\]$/.test(name.trim()) ||
        (usedBy.length > 0 &&
          usedBy.every((policy) => implicitPolicyIds.has(policy.id)))
      return {
        id,
        name,
        platform,
        isDefault,
        members: def.targets,
        memberCount: def.targets.length,
        usedBy,
      }
    }
  ).sort((a, b) => a.name.localeCompare(b.name))

  const categoryMap = new Map<string, CategoryCount>()
  for (const entry of allEntries) {
    const existing = categoryMap.get(entry.categoryId)
    if (existing) existing.count += 1
    else
      categoryMap.set(entry.categoryId, {
        id: entry.categoryId,
        label: entry.categoryLabel,
        count: 1,
      })
  }
  const categoryCounts = Array.from(categoryMap.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  )

  const customizedConfig: ConfigItem[] = (generalConfiguration?.groups ?? [])
    .flatMap((group) => group.items)
    .filter((item) => item.customized === true)

  const duplicateGroups = buildDuplicateGroups(allEntries)
  const duplicatePolicyCount = duplicateGroups.reduce(
    (sum, group) => sum + group.policies.length,
    0
  )

  const configCount = policies.filter(
    (p) => (attr(p, "action") ?? "") === "10"
  ).length

  const summary: DocumentSummary = {
    totalPolicies: policies.length,
    normalCount: normalPolicies.length,
    excludedCount: excludedPolicies.length,
    threatProtectionCount: threatProtectionPolicies.length,
    configCount,
    defaultPolicyCount: allEntries.filter((entry) => entry.implicit).length,
    guiCount: gui.length,
    categoryCounts,
    hasBaseline: options.baseline !== undefined,
    customizedConfig,
    customizedConfigCount: customizedConfig.length,
    duplicateGroups,
    duplicatePolicyCount,
  }

  return {
    meta: {
      version: attr(root, "version"),
      changeId: attr(root, "changeId"),
      merge: attr(root, "merge"),
      policyCount: policies.length,
      normalCount: normalPolicies.length,
      excludedCount: excludedPolicies.length,
      threatProtectionCount: threatProtectionPolicies.length,
      dialogCount: gui.length,
    },
    summary,
    generalConfiguration,
    normalPolicies,
    excludedPolicies,
    threatProtectionPolicies,
    gui,
    applicationGroups,
  }
}
