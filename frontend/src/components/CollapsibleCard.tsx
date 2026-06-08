import type { ReactNode } from "react"
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"
import { cx } from "../lib/ui"

interface CollapsibleCardProps {
  title: string
  icon?: LucideIcon
  count?: number
  badge?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

const CollapsibleCard = ({
  title,
  icon: Icon,
  count,
  badge,
  open,
  onToggle,
  children,
  className,
}: CollapsibleCardProps) => (
  <div
    className={cx(
      "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
      className
    )}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
    >
      {open ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      )}
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
      <h3 className="flex-1 truncate text-sm font-semibold text-slate-900">
        {title}
      </h3>
      {badge}
      {count !== undefined ? (
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
          {count}
        </span>
      ) : null}
    </button>
    {open ? <div className="border-t border-slate-100">{children}</div> : null}
  </div>
)

export default CollapsibleCard
