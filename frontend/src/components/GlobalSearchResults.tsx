import { useMemo } from "react"
import {
  ChevronRight,
  Eye,
  MonitorPlay,
  SearchX,
  Settings2,
  ShieldCheck,
  ShieldOff,
  type LucideIcon,
} from "lucide-react"
import type { ConfigItem, GuiDialog, PolicyDocument, PolicyEntry } from "../types"
import { categoryTone, cx, platformTone } from "../lib/ui"
import { getPolicyPlatforms } from "../lib/os"
import { dialogMatchesQuery, normalizeQuery, policyMatchesQuery } from "../lib/search"
import Badge from "./Badge"
import type { SummaryTarget } from "./SummaryView"

const PREVIEW_LIMIT = 20

interface GlobalSearchResultsProps {
  doc: PolicyDocument
  query: string
  onOpenDialog: (dialog: GuiDialog) => void
  onNavigate: (target: SummaryTarget) => void
}

interface ResultSectionProps {
  title: string
  icon: LucideIcon
  count: number
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}

const ResultSection = ({
  title,
  icon: Icon,
  count,
  actionLabel,
  onAction,
  children,
}: ResultSectionProps) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-slate-400" />
        {title}
        <Badge tone="neutral">{count}</Badge>
      </h3>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
    {children}
  </section>
)

const PolicyRows = ({
  policies,
  onSelect,
}: {
  policies: PolicyEntry[]
  onSelect: () => void
}) => (
  <ul className="divide-y divide-slate-50">
    {policies.slice(0, PREVIEW_LIMIT).map((policy) => {
      const platforms = getPolicyPlatforms(policy)
      return (
        <li key={policy.id}>
          <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
              {policy.name}
            </span>
            {platforms.map((platform) => (
              <Badge key={platform} tone={platformTone(platform)}>
                {platform}
              </Badge>
            ))}
            <Badge tone={categoryTone(policy.categoryId)}>{policy.categoryLabel}</Badge>
            <Badge tone="neutral">
              {policy.targetCount} {policy.targetCount === 1 ? "target" : "targets"}
            </Badge>
          </button>
        </li>
      )
    })}
    {policies.length > PREVIEW_LIMIT ? (
      <li className="px-4 py-2 text-[11px] text-slate-400">
        +{policies.length - PREVIEW_LIMIT} more
      </li>
    ) : null}
  </ul>
)

const GlobalSearchResults = ({
  doc,
  query,
  onOpenDialog,
  onNavigate,
}: GlobalSearchResultsProps) => {
  const q = normalizeQuery(query)

  const normalMatches = useMemo(
    () =>
      doc.normalPolicies.filter((policy) =>
        policyMatchesQuery(policy, q, doc.applicationGroups)
      ),
    [doc.normalPolicies, doc.applicationGroups, q]
  )
  const excludedMatches = useMemo(
    () =>
      doc.excludedPolicies.filter((policy) =>
        policyMatchesQuery(policy, q, doc.applicationGroups)
      ),
    [doc.excludedPolicies, doc.applicationGroups, q]
  )
  const dialogMatches = useMemo(
    () => doc.gui.filter((dialog) => dialogMatchesQuery(dialog, q)),
    [doc.gui, q]
  )
  const configMatches = useMemo<ConfigItem[]>(() => {
    const items = doc.generalConfiguration?.groups.flatMap((group) => group.items) ?? []
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
    )
  }, [doc.generalConfiguration, q])

  const total =
    normalMatches.length +
    excludedMatches.length +
    dialogMatches.length +
    configMatches.length

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <SearchX className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-900">
          No matches for “{query.trim()}”
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Searched policies, configuration settings, and GUI dialogs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {total} {total === 1 ? "result" : "results"} for{" "}
        <span className="font-medium text-slate-700">“{query.trim()}”</span> across the
        whole policy
      </p>

      {configMatches.length > 0 && (
        <ResultSection
          title="Configuration settings"
          icon={Settings2}
          count={configMatches.length}
          actionLabel="Open General Configuration"
          onAction={() => onNavigate("config")}
        >
          <dl className="divide-y divide-slate-50">
            {configMatches.slice(0, PREVIEW_LIMIT).map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between gap-4 px-4 py-2"
              >
                <dt className="text-xs text-slate-600">
                  {item.label}
                  {item.group ? (
                    <span className="ml-1.5 text-[11px] text-slate-400">· {item.group}</span>
                  ) : null}
                </dt>
                <dd
                  className={cx(
                    "max-w-[45%] truncate text-right text-xs font-medium",
                    item.customized ? "text-amber-700" : "text-slate-800"
                  )}
                  title={item.value}
                >
                  {item.value || "—"}
                </dd>
              </div>
            ))}
            {configMatches.length > PREVIEW_LIMIT ? (
              <div className="px-4 py-2 text-[11px] text-slate-400">
                +{configMatches.length - PREVIEW_LIMIT} more
              </div>
            ) : null}
          </dl>
        </ResultSection>
      )}

      {normalMatches.length > 0 && (
        <ResultSection
          title="Normal policies"
          icon={ShieldCheck}
          count={normalMatches.length}
          actionLabel="Open Normal Policies"
          onAction={() => onNavigate("normal")}
        >
          <PolicyRows policies={normalMatches} onSelect={() => onNavigate("normal")} />
        </ResultSection>
      )}

      {excludedMatches.length > 0 && (
        <ResultSection
          title="Excluded policies"
          icon={ShieldOff}
          count={excludedMatches.length}
          actionLabel="Open Excluded Policies"
          onAction={() => onNavigate("excluded")}
        >
          <PolicyRows policies={excludedMatches} onSelect={() => onNavigate("excluded")} />
        </ResultSection>
      )}

      {dialogMatches.length > 0 && (
        <ResultSection
          title="GUI dialogs"
          icon={MonitorPlay}
          count={dialogMatches.length}
          actionLabel="Open GUI Dialogs"
          onAction={() => onNavigate("gui")}
        >
          <ul className="divide-y divide-slate-50">
            {dialogMatches.slice(0, PREVIEW_LIMIT).map((dialog) => (
              <li key={dialog.id}>
                <button
                  type="button"
                  onClick={() => onOpenDialog(dialog)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                    {dialog.name}
                  </span>
                  <span className="hidden text-[11px] text-slate-400 sm:inline">
                    {dialog.typeLabel ?? `Type ${dialog.type ?? "?"}`}
                  </span>
                  <Badge tone={platformTone(dialog.os)}>{dialog.os}</Badge>
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </li>
            ))}
            {dialogMatches.length > PREVIEW_LIMIT ? (
              <li className="px-4 py-2 text-[11px] text-slate-400">
                +{dialogMatches.length - PREVIEW_LIMIT} more
              </li>
            ) : null}
          </ul>
        </ResultSection>
      )}
    </div>
  )
}

export default GlobalSearchResults
