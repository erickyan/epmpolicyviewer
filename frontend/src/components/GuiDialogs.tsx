import { Eye, Link2, Monitor, MonitorPlay } from "lucide-react"
import type { GuiDialog } from "../types"
import { platformTone } from "../lib/ui"
import { dialogMatchesOs, type OsFilterValue } from "../lib/os"
import { dialogMatchesQuery } from "../lib/search"
import Badge from "./Badge"

interface GuiDialogsProps {
  dialogs: GuiDialog[]
  osFilter: OsFilterValue
  query: string
  hideDefaults: boolean
  onOpenDialog: (dialog: GuiDialog) => void
}

const GuiDialogs = ({
  dialogs,
  osFilter,
  query,
  hideDefaults,
  onOpenDialog,
}: GuiDialogsProps) => {
  if (dialogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <MonitorPlay className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-900">No GUI dialogs</p>
      </div>
    )
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = dialogs.filter(
    (dialog) =>
      (!hideDefaults || !dialog.isDefault) &&
      dialogMatchesOs(dialog, osFilter) &&
      dialogMatchesQuery(dialog, normalizedQuery)
  )

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-400 shadow-sm">
        No dialogs match the current filters.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((dialog, index) => (
        <div
          key={dialog.id || index}
          className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {dialog.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {dialog.typeLabel ?? `Type ${dialog.type ?? "?"}`}
              </p>
            </div>
            <Badge tone={platformTone(dialog.os)}>
              <Monitor className="h-3 w-3" />
              {dialog.os}
            </Badge>
          </div>

          {dialog.usedBy.length > 0 ? (
            <div className="border-b border-slate-100 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Link2 className="h-3 w-3" />
                Used by {dialog.usedBy.length}{" "}
                {dialog.usedBy.length === 1 ? "policy" : "policies"}
              </p>
              <ul className="mt-1 space-y-0.5">
                {dialog.usedBy.slice(0, 4).map((policy) => (
                  <li key={policy.id} className="truncate text-xs text-slate-600">
                    {policy.name}
                  </li>
                ))}
                {dialog.usedBy.length > 4 ? (
                  <li className="text-[11px] text-slate-400">
                    +{dialog.usedBy.length - 4} more
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between px-4 py-3">
            {dialog.isDefault ? (
              <Badge tone="emerald">Default</Badge>
            ) : (
              <span className="text-xs text-slate-400">Custom</span>
            )}
            <button
              type="button"
              onClick={() => onOpenDialog(dialog)}
              aria-label={`Preview ${dialog.name} dialog`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default GuiDialogs
