import { Fragment, useEffect, useRef } from "react"
import type { LucideIcon } from "lucide-react"
import { cx } from "../lib/ui"

export type DashboardTabId =
  | "overview"
  | "intelligence"
  | "config"
  | "normal"
  | "excluded"
  | "threat"
  | "gui"
  | "appgroups"
  | "raw"

type TabGroup = "explore" | "policies" | "reference"

export interface DashboardTab {
  id: DashboardTabId
  label: string
  shortLabel: string
  icon: LucideIcon
  count?: number
  group: TabGroup
}

interface DashboardNavProps {
  tabs: DashboardTab[]
  activeTab: DashboardTabId
  hideDefaults: boolean
  onSelectTab: (tabId: DashboardTabId) => void
}

const DashboardNav = ({
  tabs,
  activeTab,
  hideDefaults,
  onSelectTab,
}: DashboardNavProps) => {
  const navRef = useRef<HTMLElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [activeTab])

  return (
    <div className="relative border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent"
      />

      <nav
        ref={navRef}
        aria-label="Dashboard sections"
        className="-mb-px flex items-stretch gap-0.5 overflow-x-auto px-2 [scrollbar-width:thin]"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          const previousGroup = index > 0 ? tabs[index - 1]?.group : null
          const showDivider = previousGroup !== null && previousGroup !== tab.group

          return (
            <Fragment key={tab.id}>
              {showDivider ? (
                <div
                  className="mx-1.5 my-2.5 w-px shrink-0 self-stretch bg-slate-200"
                  aria-hidden="true"
                />
              ) : null}
              <button
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                title={tab.label}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{tab.shortLabel}</span>
                {tab.count !== undefined ? (
                  <span
                    className={cx(
                      "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
                      isActive
                        ? "bg-slate-900 text-white"
                        : hideDefaults
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                ) : null}
              </button>
            </Fragment>
          )
        })}
      </nav>
    </div>
  )
}

export default DashboardNav
