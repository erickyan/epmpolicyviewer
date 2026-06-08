import { useMemo, useState } from "react"
import {
  Bell,
  ChevronsDownUp,
  ChevronsUpDown,
  MessageSquare,
  Settings2,
  SlidersHorizontal,
} from "lucide-react"
import type { GeneralConfiguration } from "../types"
import { cx } from "../lib/ui"
import Badge from "./Badge"
import CollapsibleCard from "./CollapsibleCard"

interface GeneralConfigViewProps {
  config: GeneralConfiguration
  query: string
  customizedOnly: boolean
}

const ALERTS_KEY = "__alerts__"
const MESSAGES_KEY = "__messages__"

const valueTone = (value: string): string => {
  const normalized = value.trim().toLowerCase()
  if (normalized === "true") return "text-emerald-600"
  if (normalized === "false") return "text-slate-400"
  return "text-slate-900"
}

const matches = (text: string, q: string): boolean =>
  text.toLowerCase().includes(q)

const GeneralConfigView = ({ config, query, customizedOnly }: GeneralConfigViewProps) => {
  const q = query.trim().toLowerCase()
  const isSearching = q !== ""

  const groups = useMemo(() => {
    let result = config.groups
    if (isSearching) {
      result = result
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => matches(item.label, q) || matches(item.value, q)
          ),
        }))
        .filter((group) => group.items.length > 0 || matches(group.title, q))
    }
    if (customizedOnly) {
      result = result
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.customized),
        }))
        .filter((group) => group.items.length > 0)
    }
    return result
  }, [config.groups, q, isSearching, customizedOnly])

  const alerts = useMemo(() => {
    if (customizedOnly) return []
    if (!isSearching) return config.alerts
    return config.alerts.filter((alert) =>
      [alert.trigger, alert.type, alert.ostype, alert.id]
        .filter(Boolean)
        .some((field) => matches(String(field), q))
    )
  }, [config.alerts, q, isSearching, customizedOnly])

  const messages = useMemo(() => {
    if (customizedOnly) return []
    if (!isSearching) return config.messages
    return config.messages.filter(
      (message) => matches(message.id, q) || matches(message.value, q)
    )
  }, [config.messages, q, isSearching, customizedOnly])

  const showAlerts = !customizedOnly && (!isSearching || alerts.length > 0)
  const showMessages = !customizedOnly && (!isSearching || messages.length > 0)
  const isEmpty = groups.length === 0 && !showAlerts && !showMessages
  const emptyMessage = customizedOnly
    ? config.customizedCount === 0
      ? "No customized settings — every curated setting matches the default standard."
      : "No customized settings match the current search."
    : "No configuration settings match the current search."

  const allKeys = useMemo(
    () => [...config.groups.map((g) => g.title), ALERTS_KEY, MESSAGES_KEY],
    [config]
  )
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const isOpen = (key: string): boolean => isSearching || customizedOnly || open.has(key)

  const expandAll = () => setOpen(new Set(allKeys))
  const collapseAll = () => setOpen(new Set())
  const allOpen = open.size === allKeys.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Settings2 className="h-4 w-4 text-slate-400" />
          <span>
            Agent configuration from{" "}
            <span className="font-medium text-slate-900">{config.policyName}</span>
          </span>
          {config.customizedCount > 0 ? (
            <Badge tone="amber">{config.customizedCount} customized</Badge>
          ) : null}
        </div>
        {!isSearching && !customizedOnly && (
          <button
            type="button"
            onClick={allOpen ? collapseAll : expandAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            {allOpen ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {isEmpty && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-400 shadow-sm">
          {emptyMessage}
        </p>
      )}

      <div className="gap-4 [column-gap:1rem] md:columns-2 xl:columns-3">
        {groups.map((group) => (
          <div key={group.title} className="mb-4 break-inside-avoid">
            <CollapsibleCard
              title={group.title}
              icon={SlidersHorizontal}
              count={group.items.length}
              open={isOpen(group.title)}
              onToggle={() => toggle(group.title)}
            >
              <dl className="divide-y divide-slate-50">
                {group.items.map((item) => (
                  <div key={item.label} className="px-4 py-2">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                        {item.label}
                        {item.customized ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ) : null}
                      </dt>
                      <dd
                        className={cx(
                          "max-w-[55%] truncate text-right text-xs font-medium",
                          item.customized ? "text-amber-700" : valueTone(item.value)
                        )}
                        title={item.value}
                      >
                        {item.value || "—"}
                      </dd>
                    </div>
                    {item.customized ? (
                      <p className="mt-0.5 text-right text-[11px] text-slate-400">
                        default:{" "}
                        <span className="line-through">{item.defaultValue || "—"}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
            </CollapsibleCard>
          </div>

        ))}

        {showAlerts && (
        <div className="mb-4 break-inside-avoid">
          <CollapsibleCard
            title="Alerts"
            icon={Bell}
            count={alerts.length}
            open={isOpen(ALERTS_KEY)}
            onToggle={() => toggle(ALERTS_KEY)}
          >
            {alerts.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">No alerts defined.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {alerts.map((alert, index) => (
                  <li
                    key={`${alert.id ?? "alert"}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
                  >
                    <span className="text-slate-600">
                      Trigger{" "}
                      <span className="font-medium text-slate-900">
                        {alert.trigger ?? "—"}
                      </span>
                      {alert.ostype ? (
                        <span className="ml-2 text-slate-400">ostype {alert.ostype}</span>
                      ) : null}
                    </span>
                    <span className="text-slate-400">{alert.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>
        </div>
        )}

        {showMessages && (
        <div className="mb-4 break-inside-avoid">
          <CollapsibleCard
            title="Custom Messages"
            icon={MessageSquare}
            count={messages.length}
            open={isOpen(MESSAGES_KEY)}
            onToggle={() => toggle(MESSAGES_KEY)}
          >
            {messages.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">No custom messages.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {messages.map((message) => (
                  <li key={message.id} className="px-4 py-2 text-xs">
                    <p className="font-mono text-[11px] text-slate-400">{message.id}</p>
                    <p className="mt-0.5 text-slate-800">{message.value}</p>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>
        </div>
        )}
      </div>
    </div>
  )
}

export default GeneralConfigView
