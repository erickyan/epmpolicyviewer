export type PolicyCategory =
  | "configuration"
  | "normal"
  | "excluded"
  | "threat-protection"

export interface TargetEntry {
  kind: string
  platform: "Windows" | "macOS" | "Linux" | "Any"
  name?: string
  publisher?: string
  location?: string
  fileName?: string
  accessType?: string
  targetId?: string
  refId?: string
  inheritable: boolean
  childProcs?: string
  serviceName?: string
  fileVerInfo?: FileVerInfoEntry[]
  memberCount?: number
  members?: TargetEntry[]
  matchesBaseline?: boolean
  attributes: Record<string, string>
}

export interface FileVerInfoEntry {
  name: string
  value: string
}

export type PolicyScopeId = "idp" | "azure" | "domain" | "other"

export interface PolicyScope {
  id: PolicyScopeId
  label: string
}

export interface UserGroupEntry {
  kind: string
  value: string
  accountType?: string
  scopeId: PolicyScopeId
  scopeLabel: string
}

export interface LinkedDialog {
  id: string
  name: string
  type?: string
  typeLabel?: string
  trigger?: string
}

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
  auditEnabled: boolean
  reportUsage?: string
  targetCount: number
  definitionCount: number
  customizedDefinitionCount: number
  hasExcludeBaseline: boolean
  inheritableTargets: number
  targets: TargetEntry[]
  userGroups: UserGroupEntry[]
  scopes: PolicyScope[]
  linkedDialogs: LinkedDialog[]
  endpointSignIn?: EndpointSignInConfig
}

export interface ConfigItem {
  label: string
  value: string
  path: string
  defaultValue?: string
  customized?: boolean
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
  threatProtectionCount: number
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
  threatProtectionCount: number
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

export interface ApplicationGroupUser {
  id: string
  name: string
}

export interface ApplicationGroupEntry {
  id: string
  name: string
  platform: "Windows" | "macOS" | "Linux" | "Any"
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
  threatProtectionPolicies: PolicyEntry[]
  gui: GuiDialog[]
  applicationGroups: ApplicationGroupEntry[]
}

export interface PolicyDocumentResponse {
  document: PolicyDocument
  source: "default" | "upload"
  fileName: string
}
