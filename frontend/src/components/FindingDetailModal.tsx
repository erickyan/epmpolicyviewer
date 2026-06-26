import { useEffect } from "react"
import { ArrowRight, ExternalLink, X } from "lucide-react"
import type { PolicyEntry, PolicyFinding, TargetEntry } from "../types"
import Badge from "./Badge"
import { shouldShowActionBadge } from "../lib/policyLabels"
import { categoryTone } from "../lib/ui"

interface FindingDetailModalProps {
  finding: PolicyFinding
  policy?: PolicyEntry
  onClose: () => void
  onOpenPolicy: (policyId: string) => void
}

const severityTone = (severity: PolicyFinding["severity"]) => {
  if (severity === "critical") return "red"
  if (severity === "warning") return "amber"
  return "slate"
}

const readDefinitionLimitEvidence = (finding: PolicyFinding) => {
  const definitionCount = Number(finding.evidence?.definitionCount ?? 0)
  const limit = Number(finding.evidence?.limit ?? 1000)
  const overBy = Math.max(definitionCount - limit, 0)
  const percentOfLimit =
    limit > 0 ? Math.round((definitionCount / limit) * 100) : 0
  const suggestedPolicyCount =
    limit > 0 ? Math.ceil(definitionCount / limit) : 0

  return { definitionCount, limit, overBy, percentOfLimit, suggestedPolicyCount }
}

const DefinitionLimitGauge = ({ finding }: { finding: PolicyFinding }) => {
  const { definitionCount, limit, overBy, percentOfLimit, suggestedPolicyCount } =
    readDefinitionLimitEvidence(finding)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold leading-none text-slate-900">
            {definitionCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            definitions in this policy
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-amber-800">
            {overBy.toLocaleString()} over limit
          </p>
          <p className="text-xs text-slate-600">
            EPM limit is {limit.toLocaleString()} ({percentOfLimit}%)
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="relative h-3 overflow-hidden rounded-full bg-white ring-1 ring-amber-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
            style={{ width: `${Math.min(percentOfLimit, 100)}%` }}
          />
          {percentOfLimit > 100 ? (
            <div className="absolute inset-y-0 left-full w-8 -translate-x-full rounded-r-full bg-red-500/80" />
          ) : null}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0</span>
          <span>{limit.toLocaleString()} limit</span>
          <span>{definitionCount.toLocaleString()} actual</span>
        </div>
      </div>

      {suggestedPolicyCount > 1 ? (
        <p className="mt-3 text-xs text-amber-900">
          Split into at least{" "}
          <span className="font-semibold">{suggestedPolicyCount} policies</span> to stay
          within the per-policy definition limit.
        </p>
      ) : null}
    </div>
  )
}

const summarizeTarget = (target: TargetEntry): string => {
  const parts: string[] = [target.platform, target.kind.replace(/([A-Z])/g, " $1").trim()]
  if (target.publisher) parts.push(target.publisher)
  if (target.location) parts.push(target.location)
  if (target.fileName) parts.push(target.fileName)
  if (target.name) parts.push(target.name)
  return parts.filter(Boolean).join(" · ")
}

const FindingDetailModal = ({
  finding,
  policy,
  onClose,
  onOpenPolicy,
}: FindingDetailModalProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const showAction =
    policy &&
    shouldShowActionBadge(policy.action, policy.actionLabel, policy.categoryLabel)

  const isDefinitionLimit = finding.ruleId === "definition-limit"

  const handleOpenPolicy = () => {
    onClose()
    onOpenPolicy(finding.policyId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Finding details: ${finding.title}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={severityTone(finding.severity)}>{finding.severity}</Badge>
              <h2 className="text-base font-semibold text-slate-900">{finding.title}</h2>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">{finding.policyName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={categoryTone(finding.policyCategory)}>{finding.categoryLabel}</Badge>
              {showAction && policy ? (
                <Badge tone="slate">{policy.actionLabel}</Badge>
              ) : null}
              <span className="font-mono text-[11px] text-slate-400">#{finding.policyId}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close finding details"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isDefinitionLimit ? <DefinitionLimitGauge finding={finding} /> : null}

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Finding
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{finding.message}</p>
            {finding.evidence &&
            Object.keys(finding.evidence).length > 0 &&
            !isDefinitionLimit ? (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
                {Object.entries(finding.evidence)
                  .filter(([key]) => key !== "duplicateGroupKey")
                  .map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="text-slate-400">{key}</dt>
                      <dd className="text-slate-700">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            ) : null}
            {finding.remediation ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                {finding.remediation}
              </p>
            ) : null}
          </section>

          {policy ? (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Policy details
              </h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
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

              {policy.targets.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Targets ({policy.targetCount})
                  </p>
                  <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                    {policy.targets.slice(0, 12).map((target, index) => (
                      <li
                        key={target.targetId ?? `${policy.id}-target-${index}`}
                        className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-100"
                      >
                        {summarizeTarget(target)}
                      </li>
                    ))}
                    {policy.targets.length > 12 ? (
                      <li className="px-1 text-[11px] text-slate-400">
                        + {policy.targets.length - 12} more target
                        {policy.targets.length - 12 === 1 ? "" : "s"}
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          {finding.docUrl ? (
            <a
              href={finding.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              CyberArk docs
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleOpenPolicy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Open in policy explorer
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FindingDetailModal
