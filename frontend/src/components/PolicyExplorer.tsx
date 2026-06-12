import { Fragment, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  GitBranch,
  Globe,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Rows3,
  ShieldOff,
  Users,
} from "lucide-react"
import type {
  ApplicationGroupEntry,
  EndpointSignInConfig,
  LinkedDialog,
  PolicyEntry,
  TargetEntry,
  UserGroupEntry,
} from "../types"
import { resolveTargetMemberCount, resolveTargetMembers, resolvePolicyDefinitionCount, policyHasCustomizedContent, filterVisibleTargets, isVisibleTarget, formatDefinitionCount } from "../lib/appGroups"
import { shouldShowActionBadge } from "../lib/policyLabels"
import { categoryTone, cx, platformTone, scopeTone } from "../lib/ui"
import { getPolicyPlatforms, policyMatchesOs, type OsFilterValue } from "../lib/os"
import { policyMatchesQuery, targetMatchesQuery } from "../lib/search"
import Badge from "./Badge"
import PaginatedMembersTable from "./PaginatedMembersTable"

type ViewMode = "grouped" | "flat"

interface PolicyExplorerProps {
  policies: PolicyEntry[]
  applicationGroups: ApplicationGroupEntry[]
  emptyMessage: string
  osFilter: OsFilterValue
  query: string
  hideDefaults: boolean
  initialCategory?: string
  onOpenDialog: (id: string) => void
  onOpenAppGroup: (id: string) => void
}

const PlatformBadges = ({ policy }: { policy: PolicyEntry }) => {
  const platforms = getPolicyPlatforms(policy)
  if (platforms.length === 0) return null
  return (
    <span className="hidden items-center gap-1 sm:inline-flex">
      {platforms.map((platform) => (
        <Badge key={platform} tone={platformTone(platform)}>
          {platform}
        </Badge>
      ))}
    </span>
  )
}

const targetIdentifier = (target: TargetEntry): string =>
  target.location ?? target.fileName ?? target.name ?? "—"

const TARGET_KIND_LABELS: Record<string, string> = {
  AdminTask: "Admin Task",
  MacAdminTask: "macOS Admin Task",
}

const kindLabel = (kind: string): string => TARGET_KIND_LABELS[kind] ?? kind

const DefinitionCountBadge = ({ count }: { count: number }) => (
  <Badge tone="neutral">{formatDefinitionCount(count)}</Badge>
)

const readableInternalTypeLabel = (label?: string): string | undefined => {
  if (!label || /^Type \d+$/.test(label)) return undefined
  return label
}

const inheritanceSummary = (policy: PolicyEntry): string => {
  if (policy.targetCount === 0) return "—"
  if (policy.inheritableTargets === 0) return "None"
  if (policy.inheritableTargets === policy.targetCount)
    return `All (${policy.targetCount})`
  return `${policy.inheritableTargets} of ${policy.targetCount}`
}

const AuditBadge = ({ policy }: { policy: PolicyEntry }) => (
  <Badge tone={policy.auditEnabled ? "emerald" : "slate"}>
    <ClipboardList className="h-3 w-3" />
    {policy.auditEnabled ? "Audit" : "No audit"}
  </Badge>
)

const ScopeBadges = ({ policy }: { policy: PolicyEntry }) => {
  if (policy.scopes.length === 0) return null
  return (
    <>
      {policy.scopes.map((scope) => (
        <Badge key={scope.id} tone={scopeTone(scope.id)}>
          <Globe className="h-3 w-3" />
          {scope.label}
        </Badge>
      ))}
    </>
  )
}

const InheritanceBadge = ({ policy }: { policy: PolicyEntry }) => {
  if (policy.inheritableTargets === 0) return null
  const isAll = policy.inheritableTargets === policy.targetCount
  return (
    <Badge tone="violet">
      <GitBranch className="h-3 w-3" />
      {isAll ? "Inheritable" : `Inherit ${policy.inheritableTargets}`}
    </Badge>
  )
}

const boolLabel = (value?: boolean): string => {
  if (value === undefined) return "—"
  return value ? "Yes" : "No"
}

const ConfigRow = ({
  label,
  value,
  mono,
}: {
  label: string
  value?: string
  mono?: boolean
}) => {
  if (!value) return null
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-0.5 py-1.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={cx("text-slate-700", mono && "break-all font-mono text-[11px]")}>
        {value}
      </span>
    </div>
  )
}

const EndpointSignInPanel = ({ config }: { config: EndpointSignInConfig }) => {
  const { oidc, mappings, fallback } = config
  const hasOidc = oidc && Object.values(oidc).some(Boolean)
  const hasMappings = mappings && Object.values(mappings).some(Boolean)
  const hasFallback = fallback && Object.values(fallback).some((v) => v !== undefined)

  if (!hasOidc && !hasMappings && !hasFallback) {
    return (
      <p className="px-4 py-4 text-xs text-slate-400">
        Endpoint sign-in policy — no OIDC configuration found in XML.
      </p>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/40 px-4 py-2">
        <KeyRound className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-800">Endpoint sign-in</span>
        <Badge tone="blue">
          {config.variant === "linux" ? "Linux Identity Bridge" : "OIDC desktop login"}
        </Badge>
      </div>

      {hasOidc ? (
        <div className="px-4 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Identity provider (OIDC)
          </p>
          <ConfigRow label="Provider name" value={oidc?.name} />
          <ConfigRow label="OpenID config URL" value={oidc?.configurationUrl} mono />
          <ConfigRow label="Client ID" value={oidc?.clientId} mono />
          <ConfigRow label="Redirect URI" value={oidc?.redirectUri} mono />
          <ConfigRow label="User domain" value={oidc?.userDomain} />
          <ConfigRow label="Scopes" value={oidc?.scopes} />
        </div>
      ) : null}

      {hasMappings ? (
        <div className="px-4 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Claim mapping (IdP token → local user)
          </p>
          <ConfigRow label="User name" value={mappings?.userName} mono />
          <ConfigRow label="First name" value={mappings?.firstName} mono />
          <ConfigRow label="Last name" value={mappings?.lastName} mono />
          <ConfigRow label="Auto-fill user name" value={mappings?.autoFillUserName} mono />
        </div>
      ) : null}

      {hasFallback ? (
        <div className="px-4 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Sign-in options
          </p>
          <ConfigRow label="Offline TOTP" value={boolLabel(fallback?.allowTotp)} />
          <ConfigRow label="Local login (offline)" value={boolLabel(fallback?.allowLocalLogin)} />
          <ConfigRow label="Require user PIN" value={boolLabel(fallback?.requireUserPin)} />
          <ConfigRow label="FIDO2 security key" value={boolLabel(fallback?.fido2Enabled)} />
          {fallback?.fido2Enabled ? (
            <ConfigRow
              label="FIDO2 enforce PIN"
              value={boolLabel(fallback.fido2EnforcePin)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const PolicySettingsStrip = ({ policy }: { policy: PolicyEntry }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-500">
    <span className="inline-flex items-center gap-1.5">
      <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
      Audit / usage reporting:{" "}
      <span
        className={cx(
          "font-semibold",
          policy.auditEnabled ? "text-emerald-700" : "text-slate-700"
        )}
      >
        {policy.auditEnabled ? "On" : "Off"}
      </span>
    </span>
    <span className="inline-flex items-center gap-1.5">
      <GitBranch className="h-3.5 w-3.5 text-slate-400" />
      Inheritance (child processes):{" "}
      <span className="font-semibold text-slate-700">
        {inheritanceSummary(policy)}
      </span>
    </span>
    <span className="inline-flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-slate-400" />
      Scope:{" "}
      <span className="font-semibold text-slate-700">
        {policy.scopes.length === 0
          ? "All users"
          : policy.scopes.map((s) => s.label).join(", ")}
      </span>
    </span>
  </div>
)

const AppGroupOpenButton = ({
  groupId,
  groupName,
  onOpenAppGroup,
}: {
  groupId: string
  groupName?: string
  onOpenAppGroup: (id: string) => void
}) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation()
      onOpenAppGroup(groupId)
    }}
    title="Open in Application Groups tab"
    aria-label={`Open ${groupName ?? "application group"} in Application Groups tab`}
    className="inline-flex shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
  >
    <ExternalLink className="h-3.5 w-3.5" />
  </button>
)

const TargetRow = ({
  target,
  nested,
  isExpanded,
  onToggleExpand,
  onOpenAppGroup,
}: {
  target: TargetEntry
  nested?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onOpenAppGroup?: (id: string) => void
}) => {
  const flags = Object.entries(target.attributes)
  const memberCount = target.memberCount ?? target.members?.length ?? 0
  const isAppGroup = target.kind === "ApplicationGroup" && !!target.refId
  const isExpandable = isAppGroup && memberCount > 0 && !!onToggleExpand
  const summary = `${target.name ?? ""}${
    memberCount > 0 ? ` · ${memberCount} app${memberCount === 1 ? "" : "s"}` : ""
  }`

  const openButton =
    isAppGroup && target.refId && onOpenAppGroup ? (
      <AppGroupOpenButton
        groupId={target.refId}
        groupName={target.name}
        onOpenAppGroup={onOpenAppGroup}
      />
    ) : null

  return (
    <tr className={cx("hover:bg-slate-50", nested && "bg-slate-50/40")}>
      <td className="px-4 py-2 text-xs font-medium text-slate-700">
        {isExpandable ? (
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded
                  ? `Collapse ${target.name ?? "application group"} definitions`
                  : `Expand ${target.name ?? "application group"} definitions`
              }
              className="flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              )}
              <span className="min-w-0">
                <span className="block">{kindLabel(target.kind)}</span>
                <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500">
                  {summary}
                </span>
              </span>
            </button>
            {openButton}
          </div>
        ) : (
          <>
            <span className={cx("flex items-center gap-1.5", nested && "pl-4")}>
              {nested ? <span className="text-slate-300">↳</span> : null}
              {kindLabel(target.kind)}
            </span>
            {isAppGroup ? (
              <div className="mt-0.5 flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] font-normal text-slate-500">
                  {summary || target.name || "Application group"}
                </span>
                {openButton}
              </div>
            ) : target.name ? (
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                {summary}
              </span>
            ) : null}
          </>
        )}
      </td>
      <td className="px-4 py-2 text-xs">
        <Badge tone={platformTone(target.platform)}>{target.platform}</Badge>
      </td>
      <td className="px-4 py-2 text-xs text-slate-600">{target.publisher ?? "—"}</td>
      <td className="px-4 py-2 text-[11px]">
        {target.location ? (
          <span className="font-mono text-slate-500">{target.location}</span>
        ) : null}
        {target.location && target.fileName ? <br /> : null}
        {target.fileName ? (
          <span className="text-slate-600">{target.fileName}</span>
        ) : null}
        {target.serviceName ? (
          <span className="block text-slate-500">svc: {target.serviceName}</span>
        ) : null}
        {target.fileVerInfo?.map((info) => (
          <span key={info.name} className="block text-slate-400">
            {info.name}: {info.value}
          </span>
        ))}
        {!target.location &&
        !target.fileName &&
        !target.serviceName &&
        !target.fileVerInfo?.length ? (
          <span className="text-slate-400">—</span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-[11px]">
        {target.inheritable ? (
          <Badge tone="violet">
            <GitBranch className="h-3 w-3" />
            Yes
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        {target.childProcs ? (
          <span className="ml-1 text-slate-400">child: {target.childProcs}</span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-[11px] text-slate-400">
        {target.accessType ? (
          <Badge tone="violet" className="mr-1">{target.accessType}</Badge>
        ) : null}
        {flags.length === 0
          ? target.accessType
            ? ""
            : "—"
          : flags.map(([k, v]) => `${k}=${v}`).join("  ·  ")}
      </td>
    </tr>
  )
}

const TargetTable = ({
  targets,
  appGroups,
  hideDefaults,
  onOpenAppGroup,
}: {
  targets: TargetEntry[]
  appGroups: ApplicationGroupEntry[]
  hideDefaults: boolean
  onOpenAppGroup: (id: string) => void
}) => {
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set())

  const handleToggleExpand = (targetKey: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev)
      if (next.has(targetKey)) next.delete(targetKey)
      else next.add(targetKey)
      return next
    })
  }

  const visibleTargets = filterVisibleTargets(targets, appGroups, hideDefaults)

  if (visibleTargets.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-slate-400">
        {hideDefaults
          ? "No customized definitions in this policy."
          : "This policy has no application targets defined."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-left">
        <thead className="bg-slate-50/70">
          <tr>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Platform</th>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Publisher</th>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">File / Location</th>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inherit</th>
            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Access / Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {visibleTargets.map((target, index) => {
            const targetKey = target.targetId ?? String(index)
            const members = resolveTargetMembers(target, appGroups).filter((member) =>
              isVisibleTarget(member, appGroups, hideDefaults)
            )
            const isExpanded = expandedTargets.has(targetKey)
            return (
              <Fragment key={targetKey}>
                <TargetRow
                  target={target}
                  isExpanded={isExpanded}
                  onToggleExpand={() => handleToggleExpand(targetKey)}
                  onOpenAppGroup={onOpenAppGroup}
                />
                {isExpanded && members.length > 0 ? (
                  <PaginatedMembersTable
                    members={members}
                    renderRow={(member, memberIndex) => (
                      <TargetRow
                        key={member.targetId ?? `${targetKey}-m${memberIndex}`}
                        target={member}
                        nested
                        onOpenAppGroup={onOpenAppGroup}
                      />
                    )}
                  />
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const TargetingPanel = ({ userGroups }: { userGroups: UserGroupEntry[] }) => {
  if (userGroups.length === 0) return null
  return (
    <div className="border-t border-slate-100 bg-amber-50/40 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        <Users className="h-3.5 w-3.5" />
        Applies to specific users / groups
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {userGroups.map((group, index) => (
          <li key={`${group.kind}-${group.value}-${index}`}>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-slate-700">
              <Badge tone={scopeTone(group.scopeId)}>
                <Globe className="h-3 w-3" />
                {group.scopeLabel}
              </Badge>
              <span className="text-slate-400">
                {group.accountType ?? group.kind}
              </span>
              {group.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const LinkedDialogsPanel = ({
  dialogs,
  onOpenDialog,
}: {
  dialogs: LinkedDialog[]
  onOpenDialog: (id: string) => void
}) => {
  if (dialogs.length === 0) return null
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <MessageSquare className="h-3.5 w-3.5" />
        Linked dialogs
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {dialogs.map((dialog) => (
          <button
            key={dialog.id}
            type="button"
            onClick={() => onOpenDialog(dialog.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            {dialog.name}
            {dialog.typeLabel ? (
              <span className="text-[11px] text-slate-400">· {dialog.typeLabel}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

const GroupedView = ({
  policies,
  appGroups,
  hideDefaults,
  query,
  onOpenDialog,
  onOpenAppGroup,
}: {
  policies: PolicyEntry[]
  appGroups: ApplicationGroupEntry[]
  hideDefaults: boolean
  query: string
  onOpenDialog: (id: string) => void
  onOpenAppGroup: (id: string) => void
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2.5">
      {policies.map((policy) => {
        const isOpen = query !== "" || expanded.has(policy.id)
        const showAction = shouldShowActionBadge(
          policy.action,
          policy.actionLabel,
          policy.categoryLabel
        )
        const internalType = readableInternalTypeLabel(policy.internalTypeLabel)
        const definitionCount = resolvePolicyDefinitionCount(
          policy,
          appGroups,
          hideDefaults
        )
        return (
          <div
            key={policy.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(policy.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {policy.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  ID {policy.id} · order {policy.order}
                  {internalType ? ` · ${internalType}` : ""}
                  {definitionCount > 0
                    ? ` · ${formatDefinitionCount(definitionCount)}`
                    : ""}
                </p>
              </div>
              <PlatformBadges policy={policy} />
              <Badge tone={categoryTone(policy.categoryId)}>
                {policy.categoryLabel}
              </Badge>
              {showAction ? <Badge tone="slate">{policy.actionLabel}</Badge> : null}
              {policy.excludeType ? <Badge tone="amber">{policy.excludeType}</Badge> : null}
              <ScopeBadges policy={policy} />
              <AuditBadge policy={policy} />
              <InheritanceBadge policy={policy} />
              {policy.userGroups.length > 0 ? (
                <Badge tone="amber">
                  <Users className="h-3 w-3" />
                  {policy.userGroups.length}
                </Badge>
              ) : null}
              {policy.linkedDialogs.length > 0 ? (
                <Badge tone="slate">
                  <MessageSquare className="h-3 w-3" />
                  {policy.linkedDialogs.length}
                </Badge>
              ) : null}
              {policy.endpointSignIn ? (
                <Badge tone="blue">
                  <KeyRound className="h-3 w-3" />
                  Sign-in
                </Badge>
              ) : definitionCount > 0 ? (
                <DefinitionCountBadge count={definitionCount} />
              ) : null}
            </button>
            {isOpen && (
              <div className="border-t border-slate-100">
                <PolicySettingsStrip policy={policy} />
                <TargetingPanel userGroups={policy.userGroups} />
                <LinkedDialogsPanel
                  dialogs={policy.linkedDialogs}
                  onOpenDialog={onOpenDialog}
                />
                {policy.endpointSignIn ? (
                  <EndpointSignInPanel config={policy.endpointSignIn} />
                ) : (
                  <TargetTable
                    targets={policy.targets}
                    appGroups={appGroups}
                    hideDefaults={hideDefaults}
                    onOpenAppGroup={onOpenAppGroup}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const FlatView = ({
  policies,
  appGroups,
  hideDefaults,
  osFilter,
  query,
  onOpenAppGroup,
}: {
  policies: PolicyEntry[]
  appGroups: ApplicationGroupEntry[]
  hideDefaults: boolean
  osFilter: OsFilterValue
  query: string
  onOpenAppGroup: (id: string) => void
}) => {
  const [orderSort, setOrderSort] = useState<"asc" | "desc" | null>(null)

  const handleToggleOrderSort = () =>
    setOrderSort((current) =>
      current === "asc" ? "desc" : current === "desc" ? null : "asc"
    )

  const rows = useMemo(() => {
    const baseRows = policies.flatMap((policy) => {
      const policyNameMatches =
        query === "" || policy.name.toLowerCase().includes(query.toLowerCase())
      return filterVisibleTargets(policy.targets, appGroups, hideDefaults)
        .filter(
          (target) =>
            (osFilter === "all" || target.platform === osFilter) &&
            (policyNameMatches ||
          targetMatchesQuery(target, query.toLowerCase(), resolveTargetMembers(target, appGroups)))
        )
        .map((target, index) => ({
          key: `${policy.id}-${target.targetId ?? index}`,
          policy,
          target,
        }))
    })

    if (!orderSort) return baseRows

    const direction = orderSort === "asc" ? 1 : -1
    const orderValue = (value: string): number => {
      const parsed = Number.parseInt(value, 10)
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
    }
    return [...baseRows].sort(
      (a, b) =>
        (orderValue(a.policy.order) - orderValue(b.policy.order)) * direction
    )
  }, [policies, appGroups, osFilter, query, orderSort, hideDefaults])

  const OrderSortIcon =
    orderSort === "asc" ? ArrowUp : orderSort === "desc" ? ArrowDown : ArrowUpDown

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400 shadow-sm">
        No targets match this filter.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  onClick={handleToggleOrderSort}
                  aria-label="Sort by policy order"
                  className={cx(
                    "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                    orderSort ? "text-slate-700" : "text-slate-500"
                  )}
                >
                  Order
                  <OrderSortIcon className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Policy</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Definitions</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Platform</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Publisher</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">File / Location</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inherit</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ key, policy, target }) => (
              <tr key={key} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-xs tabular-nums text-slate-500">
                  {policy.order || "—"}
                </td>
                <td className="px-4 py-2 text-xs font-medium text-slate-700">{policy.name}</td>
                <td className="px-4 py-2 text-xs tabular-nums text-slate-500">
                  {(() => {
                    const count = resolvePolicyDefinitionCount(
                      policy,
                      appGroups,
                      hideDefaults
                    )
                    return count > 0 ? count.toLocaleString() : "—"
                  })()}
                </td>
                <td className="px-4 py-2 text-xs">
                  <Badge tone={categoryTone(policy.categoryId)}>
                    {policy.categoryLabel}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">
                  {target.kind === "ApplicationGroup" ? (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span>{kindLabel(target.kind)}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500">
                          {target.name ?? "Application group"}
                          {resolveTargetMemberCount(target, appGroups) > 0
                            ? ` · ${resolveTargetMemberCount(target, appGroups)} apps`
                            : ""}
                        </span>
                      </div>
                      {target.refId ? (
                        <AppGroupOpenButton
                          groupId={target.refId}
                          groupName={target.name}
                          onOpenAppGroup={onOpenAppGroup}
                        />
                      ) : null}
                    </div>
                  ) : (
                    kindLabel(target.kind)
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  <Badge tone={platformTone(target.platform)}>{target.platform}</Badge>
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">{target.publisher ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                  {target.kind === "ApplicationGroup" &&
                  resolveTargetMemberCount(target, appGroups) > 0
                    ? `${resolveTargetMemberCount(target, appGroups)} definitions`
                    : targetIdentifier(target)}
                </td>
                <td className="px-4 py-2 text-[11px]">
                  {target.inheritable ? (
                    <Badge tone="violet">
                      <GitBranch className="h-3 w-3" />
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  <AuditBadge policy={policy} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PolicyExplorer = ({
  policies,
  applicationGroups,
  emptyMessage,
  osFilter,
  query,
  hideDefaults,
  initialCategory,
  onOpenDialog,
  onOpenAppGroup,
}: PolicyExplorerProps) => {
  const [view, setView] = useState<ViewMode>("grouped")
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory ?? "all")

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const policy of policies) map.set(policy.categoryId, policy.categoryLabel)
    return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    )
  }, [policies])

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = policies.filter(
    (policy) =>
      policyHasCustomizedContent(policy, applicationGroups, hideDefaults) &&
      (categoryFilter === "all" || policy.categoryId === categoryFilter) &&
      policyMatchesOs(policy, osFilter) &&
      policyMatchesQuery(policy, normalizedQuery, applicationGroups)
  )

  if (policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <ShieldOff className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-900">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {filtered.length} of {policies.length}{" "}
          {policies.length === 1 ? "policy" : "policies"}
          {categoryFilter !== "all"
            ? ` · ${categories.find((c) => c.id === categoryFilter)?.label ?? ""}`
            : ""}
          {osFilter !== "all" ? ` · ${osFilter}` : ""}
          {normalizedQuery ? ` · “${query.trim()}”` : ""}
        </p>
        <div className="flex items-center gap-2">
          {categories.length > 1 ? (
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          ) : null}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView("grouped")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "grouped" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grouped
            </button>
            <button
              type="button"
              onClick={() => setView("flat")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "flat" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Flat
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-400 shadow-sm">
          No policies match the current filters.
        </p>
      ) : view === "grouped" ? (
        <GroupedView
          policies={filtered}
          appGroups={applicationGroups}
          hideDefaults={hideDefaults}
          query={normalizedQuery}
          onOpenDialog={onOpenDialog}
          onOpenAppGroup={onOpenAppGroup}
        />
      ) : (
        <FlatView
          policies={filtered}
          appGroups={applicationGroups}
          hideDefaults={hideDefaults}
          osFilter={osFilter}
          query={normalizedQuery}
          onOpenAppGroup={onOpenAppGroup}
        />
      )}
    </div>
  )
}

export default PolicyExplorer
