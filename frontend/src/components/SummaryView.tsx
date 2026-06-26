import {
  Layers,
  MonitorPlay,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"
import type { DocumentSummary } from "../types"
import type { OverviewCounts } from "../lib/customizedCounts"
import { cx } from "../lib/ui"
import Badge from "./Badge"

export type SummaryTarget =
  | "config"
  | "intelligence"
  | "normal"
  | "excluded"
  | "threat"
  | "gui"
  | "default"

interface SummaryViewProps {
  summary: DocumentSummary
  counts: OverviewCounts
  hideDefaults: boolean
  onNavigate: (target: SummaryTarget) => void
}

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  onClick?: () => void
  accent?: boolean
}

const StatCard = ({ label, value, icon: Icon, onClick, accent }: StatCardProps) => {
  const content = (
    <>
      <div
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs leading-snug text-slate-500">{label}</p>
      </div>
    </>
  )

  const base =
    "flex min-w-[9.5rem] items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          base,
          "text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        )}
      >
        {content}
      </button>
    )
  }

  return <div className={base}>{content}</div>
}

const SectionCard = ({
  title,
  badge,
  children,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) => (
  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {badge}
    </div>
    {children}
  </section>
)

const SummaryView = ({
  summary,
  counts,
  hideDefaults,
  onNavigate,
}: SummaryViewProps) => {
  const filteredTone = hideDefaults

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(10.75rem,1fr))]">
        <StatCard
          label="Total policies"
          value={counts.totalPolicies}
          icon={Layers}
          accent={filteredTone}
          onClick={() => onNavigate("normal")}
        />
        <StatCard
          label="Normal policies"
          value={counts.normal}
          icon={ShieldCheck}
          accent={filteredTone}
          onClick={() => onNavigate("normal")}
        />
        <StatCard
          label="Excluded policies"
          value={counts.excluded}
          icon={ShieldOff}
          accent={filteredTone}
          onClick={() => onNavigate("excluded")}
        />
        {(hideDefaults ? counts.threat > 0 : summary.threatProtectionCount > 0) ? (
          <StatCard
            label="Threat protection"
            value={counts.threat}
            icon={ShieldAlert}
            accent={filteredTone}
            onClick={() => onNavigate("threat")}
          />
        ) : null}
        <StatCard
          label="Default policies"
          value={counts.defaultPolicies}
          icon={PackageCheck}
          accent={filteredTone}
          onClick={
            counts.defaultPolicies > 0 ? () => onNavigate("default") : undefined
          }
        />
        <StatCard
          label="GUI dialogs"
          value={counts.gui}
          icon={MonitorPlay}
          accent={filteredTone}
          onClick={() => onNavigate("gui")}
        />
        <StatCard
          label="Customized settings"
          value={counts.customizedSettings}
          icon={SlidersHorizontal}
          accent={counts.customizedSettings > 0 || filteredTone}
          onClick={() => onNavigate("config")}
        />
        <StatCard
          label="Policy findings"
          value={counts.findings}
          icon={ShieldAlert}
          accent={counts.findingsAccent || filteredTone}
          onClick={
            counts.findings > 0 ? () => onNavigate("intelligence") : undefined
          }
        />
      </div>

    <SectionCard
      title="Customized general configuration"
      badge={
        summary.hasBaseline ? (
          <Badge tone={summary.customizedConfigCount > 0 ? "amber" : "emerald"}>
            {summary.customizedConfigCount > 0
              ? `${summary.customizedConfigCount} changed`
              : "Matches standard"}
          </Badge>
        ) : (
          <Badge tone="slate">No baseline</Badge>
        )
      }
    >
      {!summary.hasBaseline ? (
        <p className="px-4 py-5 text-xs text-slate-400">
          A default baseline isn’t available, so customized settings can’t be computed.
        </p>
      ) : summary.customizedConfig.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-500">
          All curated settings match the default policy standard — no deviations detected.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Setting</th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current value</th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summary.customizedConfig.map((item) => (
                <tr key={item.path} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-700">
                    {item.label}
                    {item.group ? (
                      <span className="ml-1.5 text-[11px] text-slate-400">· {item.group}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-xs font-medium text-amber-700">
                    {item.value || "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400 line-through">
                    {item.defaultValue || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
    </div>
  )
}

export default SummaryView
