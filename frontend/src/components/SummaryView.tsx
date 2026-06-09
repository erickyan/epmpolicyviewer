import { useRef } from "react"
import {
  Copy,
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
import { categoryTone, cx } from "../lib/ui"
import Badge from "./Badge"

export type SummaryTarget =
  | "config"
  | "normal"
  | "excluded"
  | "threat"
  | "gui"
  | "default"

interface SummaryViewProps {
  summary: DocumentSummary
  onNavigate: (target: SummaryTarget) => void
  onSelectCategory: (categoryId: string) => void
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
          "flex h-9 w-9 items-center justify-center rounded-lg",
          accent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{label}</p>
      </div>
    </>
  )

  const base =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"

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

const SummaryView = ({ summary, onNavigate, onSelectCategory }: SummaryViewProps) => {
  const categoryRef = useRef<HTMLDivElement>(null)
  const duplicatesRef = useRef<HTMLDivElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  const hasCategories = summary.categoryCounts.length > 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Total policies"
          value={summary.totalPolicies}
          icon={Layers}
          onClick={hasCategories ? () => scrollTo(categoryRef) : undefined}
        />
        <StatCard
          label="Normal policies"
          value={summary.normalCount}
          icon={ShieldCheck}
          onClick={() => onNavigate("normal")}
        />
        <StatCard
          label="Excluded policies"
          value={summary.excludedCount}
          icon={ShieldOff}
          onClick={() => onNavigate("excluded")}
        />
        {summary.threatProtectionCount > 0 ? (
          <StatCard
            label="Threat protection"
            value={summary.threatProtectionCount}
            icon={ShieldAlert}
            onClick={() => onNavigate("threat")}
          />
        ) : null}
        <StatCard
          label="Default policies"
          value={summary.defaultPolicyCount}
          icon={PackageCheck}
          onClick={
            summary.defaultPolicyCount > 0 ? () => onNavigate("default") : undefined
          }
        />
        <StatCard
          label="GUI dialogs"
          value={summary.guiCount}
          icon={MonitorPlay}
          onClick={() => onNavigate("gui")}
        />
        <StatCard
          label="Customized settings"
          value={summary.customizedConfigCount}
          icon={SlidersHorizontal}
          accent={summary.customizedConfigCount > 0}
          onClick={() => onNavigate("config")}
        />
        <StatCard
          label="Duplicate groups"
          value={summary.duplicateGroups.length}
          icon={Copy}
          accent={summary.duplicateGroups.length > 0}
          onClick={
            summary.duplicateGroups.length > 0 ? () => scrollTo(duplicatesRef) : undefined
          }
        />
      </div>

      {hasCategories && (
        <div ref={categoryRef} className="scroll-mt-4">
          <SectionCard title="Policies by category">
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {summary.categoryCounts.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(category.id)}
                  title={`View ${category.label} policies`}
                  className="rounded-full transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                >
                  <Badge tone={categoryTone(category.id)} className="cursor-pointer">
                    {category.label}
                    <span className="ml-1 font-semibold">{category.count}</span>
                  </Badge>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

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

    <div ref={duplicatesRef} className="scroll-mt-4">
    <SectionCard
      title="Potential duplicate policies"
      badge={
        summary.duplicateGroups.length > 0 ? (
          <Badge tone="amber">
            {summary.duplicateGroups.length} group
            {summary.duplicateGroups.length === 1 ? "" : "s"} ·{" "}
            {summary.duplicatePolicyCount} policies
          </Badge>
        ) : (
          <Badge tone="emerald">None found</Badge>
        )
      }
    >
      {summary.duplicateGroups.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-500">
          No duplicate policies detected (by identical action + targets or by name).
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {summary.duplicateGroups.map((group, index) => (
            <li key={index} className="px-4 py-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {group.reason}
              </p>
              <ul className="space-y-1">
                {group.policies.map((policy) => (
                  <li
                    key={policy.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-slate-700">{policy.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-slate-400">
                      <Badge tone="slate">{policy.categoryLabel}</Badge>
                      <span>order {policy.order}</span>
                      <span className="font-mono">#{policy.id}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
    </div>
    </div>
  )
}

export default SummaryView
