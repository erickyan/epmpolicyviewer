export interface RawPolicyAttributes {
  "@_id"?: string | number
  "@_name"?: string
  "@_action"?: string | number
  "@_order"?: string | number
}

export type PolicyCategory = "configuration" | "normal" | "excluded"

export interface TargetEntry {
  kind: string
  platform: "Windows" | "macOS" | "Linux" | "Any"
  name?: string
  publisher?: string
  location?: string
  fileName?: string
  accessType?: string
  targetId?: string
  // Reference to another element (e.g. ApplicationGroup / Token id).
  refId?: string
  // Inheritance: the rule also applies to child processes spawned by the target.
  inheritable: boolean
  childProcs?: string
  // Windows service name (<SvcName>) the target is matched by.
  serviceName?: string
  // File version metadata (<FileVerInfo name="…">value</…>) used for matching.
  fileVerInfo?: FileVerInfoEntry[]
  // For ApplicationGroup references: the member applications resolved from the
  // root <ApplicationGroups> definition.
  members?: TargetEntry[]
  attributes: Record<string, string>
}

export interface FileVerInfoEntry {
  name: string
  value: string
}

// "Specific targeting" — the users/groups a policy applies to (SCIM/IdP, AD, Azure).
export interface UserGroupEntry {
  kind: string
  value: string
  accountType?: string
  // Directory source the principal comes from.
  scopeId: PolicyScopeId
  scopeLabel: string
}

// The directory source a policy is scoped to.
export type PolicyScopeId = "idp" | "azure" | "domain" | "other"

export interface PolicyScope {
  id: PolicyScopeId
  label: string
}

// A dialog referenced by a policy's <Alert>, resolved by matching Alert.id === Dialog.id.
export interface LinkedDialog {
  id: string
  name: string
  type?: string
  typeLabel?: string
  trigger?: string
}

// Action 24 — Endpoint sign-in (Windows/macOS OIDC desktop login).
export interface EndpointSignInOidcConfig {
  name?: string
  configurationUrl?: string
  clientId?: string
  redirectUri?: string
  userDomain?: string
  scopes?: string
}

export interface EndpointSignInMappings {
  userName?: string
  firstName?: string
  lastName?: string
  autoFillUserName?: string
}

export interface EndpointSignInFallbackOptions {
  allowTotp?: boolean
  allowLocalLogin?: boolean
  requireUserPin?: boolean
  fido2Enabled?: boolean
  fido2EnforcePin?: boolean
}

export interface EndpointSignInConfig {
  variant: "windows" | "linux"
  oidc?: EndpointSignInOidcConfig
  mappings?: EndpointSignInMappings
  fallback?: EndpointSignInFallbackOptions
}

export interface PolicyEntry {
  id: string
  name: string
  action: string
  actionLabel: string
  order: string
  category: PolicyCategory
  categoryId: string
  categoryLabel: string
  implicit: boolean
  excludeType?: string
  internalType?: string
  internalTypeLabel?: string
  serverPolicyId?: string
  winMav?: string
  macMav?: string
  // Audit / usage reporting (EPM `reportUsage`; "2" = off, absent = on).
  auditEnabled: boolean
  reportUsage?: string
  targetCount: number
  // How many of the targets are inheritable (apply to child processes).
  inheritableTargets: number
  targets: TargetEntry[]
  userGroups: UserGroupEntry[]
  // Distinct directory sources the policy is scoped to (empty = all users).
  scopes: PolicyScope[]
  linkedDialogs: LinkedDialog[]
  // Present for action 24 (Endpoint sign-in) policies.
  endpointSignIn?: EndpointSignInConfig
}

export interface ConfigItem {
  label: string
  value: string
  path: string
  // Present only when a default baseline is available for comparison.
  defaultValue?: string
  customized?: boolean
  // Group title, used when an item is surfaced in the summary out of context.
  group?: string
}

export interface ConfigGroup {
  title: string
  items: ConfigItem[]
}

export interface AlertEntry {
  id?: string
  trigger?: string
  type?: string
  ostype?: string
}

export interface MessageEntry {
  id: string
  value: string
}

export interface GeneralConfiguration {
  policyId: string
  policyName: string
  order: string
  groups: ConfigGroup[]
  alerts: AlertEntry[]
  messages: MessageEntry[]
  customizedCount: number
}

export interface DialogUser {
  id: string
  name: string
}

export interface GuiDialog {
  id: string
  name: string
  type?: string
  typeLabel?: string
  os: "Windows" | "macOS" | "Any"
  isDefault: boolean
  html: string
  sourceHtml: string
  usedBy: DialogUser[]
}

export interface PolicyDocumentMeta {
  version?: string
  changeId?: string
  merge?: string
  policyCount: number
  normalCount: number
  excludedCount: number
  dialogCount: number
}

export interface CategoryCount {
  id: string
  label: string
  count: number
}

export interface DuplicatePolicy {
  id: string
  name: string
  categoryLabel: string
  order: string
}

export interface DuplicateGroup {
  reason: string
  policies: DuplicatePolicy[]
}

export interface DocumentSummary {
  totalPolicies: number
  normalCount: number
  excludedCount: number
  configCount: number
  defaultPolicyCount: number
  guiCount: number
  categoryCounts: CategoryCount[]
  hasBaseline: boolean
  customizedConfig: ConfigItem[]
  customizedConfigCount: number
  duplicateGroups: DuplicateGroup[]
  duplicatePolicyCount: number
}

// A policy that references an ApplicationGroup (reverse lookup).
export interface ApplicationGroupUser {
  id: string
  name: string
}

// A root <ApplicationGroups>/<ApplicationGroup> definition: a reusable, named set
// of application targets that policies reference by id.
export interface ApplicationGroupEntry {
  id: string
  name: string
  platform: "Windows" | "macOS" | "Linux" | "Any"
  // True for predefined/baseline groups (bracketed default names, or referenced
  // only by default/implicit policies). Hidden under the "Customized only" filter.
  isDefault: boolean
  members: TargetEntry[]
  memberCount: number
  usedBy: ApplicationGroupUser[]
}

export interface PolicyDocument {
  meta: PolicyDocumentMeta
  summary: DocumentSummary
  generalConfiguration: GeneralConfiguration | null
  normalPolicies: PolicyEntry[]
  excludedPolicies: PolicyEntry[]
  gui: GuiDialog[]
  applicationGroups: ApplicationGroupEntry[]
  rawXml: string
}
