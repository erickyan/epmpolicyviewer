import { useEffect } from "react"
import { ArrowRight, X } from "lucide-react"
import type { PolicyEntry, TargetEntry } from "../types"
import Badge from "./Badge"
import { shouldShowActionBadge } from "../lib/policyLabels"
import { categoryTone, cx } from "../lib/ui"

interface DuplicateComparisonModalProps {
  title: string
  reason: string
  remediation?: string
  policies: PolicyEntry[]
  onClose: () => void
  onOpenPolicy: (policyId: string) => void
}

const summarizeTarget = (target: TargetEntry): string => {
  const parts: string[] = [target.platform, target.kind.replace(/([A-Z])/g, " $1").trim()]
  if (target.publisher) parts.push(target.publisher)
  if (target.location) parts.push(target.location)
  if (target.fileName) parts.push(target.fileName)
  if (target.name) parts.push(target.name)
  return parts.filter(Boolean).join(" · ")
}

const PolicyColumn = ({
  policy,
  onOpenPolicy,
}: {
  policy: PolicyEntry
  onOpenPolicy: (policyId: string) => void
}) => {
  const visibleTargets = policy.targets.slice(0, 12)
  const hiddenTargetCount = policy.targets.length - visibleTargets.length
  const showAction = shouldShowActionBadge(
    policy.action,
    policy.actionLabel,
    policy.categoryLabel
  )

  return (
    <div className="flex min-w-[16rem] flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/40">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold leading-snug text-slate-900">{policy.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={categoryTone(policy.categoryId)}>{policy.categoryLabel}</Badge>
          {showAction ? <Badge tone="slate">{policy.actionLabel}</Badge> : null}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-b border-slate-200 px-4 py-3 text-xs">
        <dt className="text-slate-400">Policy ID</dt>
        <dd className="font-mono text-slate-700">#{policy.id}</dd>
        <dt className="text-slate-400">Order</dt>
        <dd className="text-slate-700">{policy.order}</dd>
        <dt className="text-slate-400">Audit</dt>
        <dd className={policy.auditEnabled ? "font-medium text-emerald-700" : "text-slate-700"}>
          {policy.auditEnabled ? "On" : "Off"}
        </dd>
        <dt className="text-slate-400">Definitions</dt>
        <dd className="text-slate-700">{policy.definitionCount.toLocaleString()}</dd>
        <dt className="text-slate-400">User groups</dt>
        <dd className="text-slate-700">
          {policy.userGroups.length === 0
            ? "All users"
            : policy.userGroups.map((group) => group.value).join(", ")}
        </dd>
        <dt className="text-slate-400">Scope</dt>
        <dd className="text-slate-700">
          {policy.scopes.length === 0
            ? "All users"
            : policy.scopes.map((scope) => scope.label).join(", ")}
        </dd>
      </dl>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Targets ({policy.targetCount})
        </p>
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-xs text-slate-600">
          {visibleTargets.map((target, index) => (
            <li
              key={target.targetId ?? `${policy.id}-target-${index}`}
              className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-100"
            >
              {summarizeTarget(target)}
            </li>
          ))}
          {hiddenTargetCount > 0 ? (
            <li className="px-1 text-[11px] text-slate-400">
              + {hiddenTargetCount} more target{hiddenTargetCount === 1 ? "" : "s"}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenPolicy(policy.id)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Open in policy explorer
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const DuplicateComparisonModal = ({
  title,
  reason,
  remediation,
  policies,
  onClose,
  onOpenPolicy,
}: DuplicateComparisonModalProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleOpenPolicy = (policyId: string) => {
    onClose()
    onOpenPolicy(policyId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Compare duplicate policies: ${title}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{reason}</p>
            {remediation ? (
              <p className="mt-2 text-xs text-amber-800">{remediation}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close duplicate comparison"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-5">
          <div
            className={cx(
              "flex min-w-min gap-4",
              policies.length > 2 ? "items-stretch" : "items-start"
            )}
          >
            {policies.map((policy) => (
              <PolicyColumn
                key={policy.id}
                policy={policy}
                onOpenPolicy={handleOpenPolicy}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DuplicateComparisonModal
