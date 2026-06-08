import { Apple, Filter, Monitor, Terminal } from "lucide-react"
import { cx } from "../lib/ui"
import type { OsFilterValue } from "../lib/os"

interface OsFilterProps {
  value: OsFilterValue
  onChange: (value: OsFilterValue) => void
  available: OsFilterValue[]
}

const OS_ICON: Record<string, typeof Monitor> = {
  Windows: Monitor,
  macOS: Apple,
  Linux: Terminal,
}

const OsFilter = ({ value, onChange, available }: OsFilterProps) => {
  const options: OsFilterValue[] = ["all", ...available]

  return (
    <div className="inline-flex items-center gap-2">
      <Filter className="h-3.5 w-3.5 text-slate-400" />
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        {options.map((option) => {
          const isActive = option === value
          const Icon = option === "all" ? null : OS_ICON[option]
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={isActive}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {option === "all" ? "All OS" : option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OsFilter
