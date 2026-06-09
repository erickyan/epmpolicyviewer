import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { TargetEntry } from "../types"
import { cx } from "../lib/ui"

export const MEMBERS_PAGE_SIZE = 25

interface PaginatedMembersTableProps {
  members: TargetEntry[]
  renderRow: (member: TargetEntry, index: number) => ReactNode
  emptyMessage?: string
}

const PaginatedMembersTable = ({
  members,
  renderRow,
  emptyMessage = "This application group has no member applications.",
}: PaginatedMembersTableProps) => {
  const [page, setPage] = useState(0)

  if (members.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-slate-400">{emptyMessage}</p>
    )
  }

  const totalPages = Math.ceil(members.length / MEMBERS_PAGE_SIZE)
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * MEMBERS_PAGE_SIZE
  const pageMembers = members.slice(start, start + MEMBERS_PAGE_SIZE)
  const showPagination = members.length > MEMBERS_PAGE_SIZE

  const handlePrev = () => setPage((current) => Math.max(0, current - 1))
  const handleNext = () =>
    setPage((current) => Math.min(totalPages - 1, current + 1))

  return (
    <>
      {pageMembers.map((member, index) => renderRow(member, start + index))}
      {showPagination ? (
        <tr className="bg-slate-50/60">
          <td colSpan={6} className="px-4 py-2">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Showing {start + 1}–{Math.min(start + MEMBERS_PAGE_SIZE, members.length)} of{" "}
                {members.length} definitions
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safePage === 0}
                  aria-label="Previous page of definitions"
                  className={cx(
                    "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                    safePage === 0
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="px-1 tabular-nums">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next page of definitions"
                  className={cx(
                    "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                    safePage >= totalPages - 1
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

export default PaginatedMembersTable
