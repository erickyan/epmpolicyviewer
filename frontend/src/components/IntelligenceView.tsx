import { useMemo, useState } from "react"
import { ExternalLink, Sparkles } from "lucide-react"
import type { IntelligenceReport, PolicyFinding } from "../types"
import Badge from "./Badge"
import { categoryTone } from "../lib/ui"

interface IntelligenceViewProps {
  intelligence: IntelligenceReport
  query: string
  onOpenPolicy: (policyId: string) => void
}

type SeverityFilter = "all" | "critical" | "warning" | "info"

const severityTone = (severity: PolicyFinding["severity"]) => {
  if (severity === "critical") return "red"
  if (severity === "warning") return "amber"
  return "slate"
}

const matchesQuery = (finding: PolicyFinding, query: string): boolean => {
  if (!query) return true
  const haystack = [
    finding.title,
    finding.message,
    finding.policyName,
    finding.categoryLabel,
    finding.ruleId,
    finding.remediation ?? "",
    ...Object.values(finding.evidence ?? {}).map(String),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(query)
}

const IntelligenceView = ({
  intelligence,
  query,
  onOpenPolicy,
}: IntelligenceViewProps) => {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [ruleFilter, setRuleFilter] = useState("all")

  const normalizedQuery = query.trim().toLowerCase()

  const rules = useMemo(() => {
    const map = new Map<string, string>()
    for (const finding of intelligence.findings) {
      if (!map.has(finding.ruleId)) map.set(finding.ruleId, finding.title)
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }))
  }, [intelligence.findings])

  const filtered = useMemo(
    () =>
      intelligence.findings.filter(
        (finding) =>
          (severityFilter === "all" || finding.severity === severityFilter) &&
          (ruleFilter === "all" || finding.ruleId === ruleFilter) &&
          matchesQuery(finding, normalizedQuery)
      ),
    [intelligence.findings, normalizedQuery, ruleFilter, severityFilter]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, PolicyFinding[]>()
    for (const finding of filtered) {
      const list = map.get(finding.ruleId) ?? []
      list.push(finding)
      map.set(finding.ruleId, list)
    }
    return [...map.entries()].map(([ruleId, findings]) => ({
      ruleId,
      title: findings[0]?.title ?? ruleId,
      docUrl: findings[0]?.docUrl,
      severity: findings[0]?.severity ?? "info",
      findings,
    }))
  }, [filtered])

  const totalActionable =
    intelligence.counts.critical + intelligence.counts.warning

  if (intelligence.findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Sparkles className="mb-3 h-8 w-8 text-emerald-500" />
        <p className="text-sm font-medium text-slate-900">No policy issues detected</p>
        <p className="mt-1 text-xs text-slate-500">
          {intelligence.rulesRun} intelligence rules checked this document.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={intelligence.counts.critical > 0 ? "red" : "slate"}>
          {intelligence.counts.critical} critical
        </Badge>
        <Badge tone={intelligence.counts.warning > 0 ? "amber" : "slate"}>
          {intelligence.counts.warning} warning
        </Badge>
        <Badge tone="slate">{intelligence.counts.info} info</Badge>
        <span className="text-xs text-slate-500">
          {filtered.length} of {intelligence.findings.length} findings
          {normalizedQuery ? ` · “${query.trim()}”` : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
          aria-label="Filter by severity"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          value={ruleFilter}
          onChange={(event) => setRuleFilter(event.target.value)}
          aria-label="Filter by rule"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <option value="all">All rules</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500 shadow-sm">
          No findings match this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <section
              key={group.ruleId}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(group.severity)}>{group.severity}</Badge>
                    <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.findings.length}{" "}
                    {group.findings.length === 1 ? "policy" : "policies"} affected
                  </p>
                </div>
                {group.docUrl ? (
                  <a
                    href={group.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    CyberArk docs
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <ul className="divide-y divide-slate-50">
                {group.findings.map((finding) => (
                  <li key={`${finding.ruleId}-${finding.policyId}-${finding.title}`}>
                    <button
                      type="button"
                      onClick={() => onOpenPolicy(finding.policyId)}
                      className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {finding.policyName}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={categoryTone(finding.policyCategory)}>
                            {finding.categoryLabel}
                          </Badge>
                          <span className="font-mono text-[11px] text-slate-400">
                            #{finding.policyId}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">{finding.message}</p>
                      {finding.evidence && Object.keys(finding.evidence).length > 0 ? (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                          {Object.entries(finding.evidence).map(([key, value]) => (
                            <div key={key} className="contents">
                              <dt className="text-slate-400">{key}</dt>
                              <dd className="text-slate-600">{String(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {finding.remediation ? (
                        <p className="text-[11px] text-amber-800">{finding.remediation}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {totalActionable === 0 ? (
        <p className="text-xs text-slate-500">
          Only informational findings remain. Review duplicates and other notes above.
        </p>
      ) : null}
    </div>
  )
}

export default IntelligenceView
