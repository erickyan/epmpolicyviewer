import { Fragment } from "react"
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

const TabButton = ({
  tab,
  isActive,
  hideDefaults,
  onSelect,
}: {
  tab: DashboardTab
  isActive: boolean
  hideDefaults: boolean
  onSelect: () => void
}) => {
  const Icon = tab.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      title={tab.label}
      className={cx(
        "inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 sm:px-3",
        isActive
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{tab.shortLabel}</span>
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
  )
}

const PrimaryTabs = ({
  tabs,
  activeTab,
  hideDefaults,
  onSelectTab,
}: DashboardNavProps) => (
  <div className="flex min-w-0 flex-1 flex-wrap items-stretch gap-x-0.5 gap-y-0">
    {tabs.map((tab, index) => {
      const previousGroup = index > 0 ? tabs[index - 1]?.group : null
      const showDivider = previousGroup !== null && previousGroup !== tab.group

      return (
        <Fragment key={tab.id}>
          {showDivider ? (
            <div
              className="mx-1 my-2.5 hidden w-px shrink-0 self-stretch bg-slate-200 sm:block"
              aria-hidden="true"
            />
          ) : null}
          <TabButton
            tab={tab}
            isActive={tab.id === activeTab}
            hideDefaults={hideDefaults}
            onSelect={() => onSelectTab(tab.id)}
          />
        </Fragment>
      )
    })}
  </div>
)

const DashboardNav = ({
  tabs,
  activeTab,
  hideDefaults,
  onSelectTab,
}: DashboardNavProps) => {
  const intelligenceTab = tabs.find((tab) => tab.id === "intelligence")
  const primaryTabs = tabs.filter((tab) => tab.id !== "intelligence")

  return (
    <div className="border-b border-slate-200 bg-white/80 px-2 backdrop-blur-sm sm:px-3">
      <div className="-mb-px flex flex-wrap items-stretch justify-between gap-x-2">
        <PrimaryTabs
          tabs={primaryTabs}
          activeTab={activeTab}
          hideDefaults={hideDefaults}
          onSelectTab={onSelectTab}
        />

        {intelligenceTab ? (
          <div className="ml-auto flex shrink-0 items-stretch border-slate-200 sm:border-l sm:pl-2">
            <TabButton
              tab={intelligenceTab}
              isActive={activeTab === "intelligence"}
              hideDefaults={hideDefaults}
              onSelect={() => onSelectTab("intelligence")}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default DashboardNav
