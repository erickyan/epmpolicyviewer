import { useEffect, useMemo, useRef, useState } from "react"
import { Boxes, ChevronDown, ChevronLeft, ChevronRight, Users } from "lucide-react"
import type { ApplicationGroupEntry, TargetEntry } from "../types"
import { cx, platformTone } from "../lib/ui"
import { targetMatchesQuery } from "../lib/search"
import Badge from "./Badge"
import { MEMBERS_PAGE_SIZE } from "./PaginatedMembersTable"

interface ApplicationGroupsViewProps {
  groups: ApplicationGroupEntry[]
  query: string
  hideDefaults: boolean
  selectedId?: string | null
  onOpenPolicy?: (policyId: string) => void
}

const memberIdentifier = (target: TargetEntry): string =>
  target.location ?? target.fileName ?? target.name ?? "—"

const groupMatchesQuery = (group: ApplicationGroupEntry, query: string): boolean => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    group.name.toLowerCase().includes(q) ||
    group.id.toLowerCase().includes(q) ||
    group.usedBy.some((policy) => policy.name.toLowerCase().includes(q)) ||
    group.members.some((member) => targetMatchesQuery(member, q))
  )
}

const MembersTable = ({ members }: { members: TargetEntry[] }) => {
  const [page, setPage] = useState(0)

  if (members.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-slate-400">
        This application group has no member applications.
      </p>
    )
  }

  const totalPages = Math.ceil(members.length / MEMBERS_PAGE_SIZE)
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * MEMBERS_PAGE_SIZE
  const pageMembers = members.slice(start, start + MEMBERS_PAGE_SIZE)
  const showPagination = members.length > MEMBERS_PAGE_SIZE

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Platform</th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Publisher</th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">File / Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageMembers.map((member, index) => (
              <tr key={member.targetId ?? start + index} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-xs font-medium text-slate-700">
                  {member.kind}
                  {member.name ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                      {member.name}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-xs">
                  <Badge tone={platformTone(member.platform)}>{member.platform}</Badge>
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">{member.publisher ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                  {memberIdentifier(member)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPagination ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
          <span>
            Showing {start + 1}–{Math.min(start + MEMBERS_PAGE_SIZE, members.length)} of{" "}
            {members.length} definitions
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
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
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
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
      ) : null}
    </div>
  )
}

const UsedByPanel = ({
  group,
  onOpenPolicy,
}: {
  group: ApplicationGroupEntry
  onOpenPolicy?: (policyId: string) => void
}) => (
  <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <Users className="h-3.5 w-3.5" />
      {group.usedBy.length === 0
        ? "Not referenced by any policy"
        : `Used by ${group.usedBy.length} ${group.usedBy.length === 1 ? "policy" : "policies"}`}
    </p>
    {group.usedBy.length > 0 ? (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {group.usedBy.map((policy) =>
          onOpenPolicy ? (
            <button
              key={policy.id}
              type="button"
              onClick={() => onOpenPolicy(policy.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {policy.name}
            </button>
          ) : (
            <span
              key={policy.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {policy.name}
            </span>
          )
        )}
      </div>
    ) : null}
  </div>
)

const ApplicationGroupsView = ({
  groups,
  query,
  hideDefaults,
  selectedId,
  onOpenPolicy,
}: ApplicationGroupsViewProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      groups.filter(
        (group) =>
          (!hideDefaults || !group.isDefault) &&
          groupMatchesQuery(group, normalizedQuery)
      ),
    [groups, hideDefaults, normalizedQuery]
  )

  // Deep-link: auto-expand and scroll to a group selected from a policy target.
  useEffect(() => {
    if (!selectedId) return
    setExpanded((prev) => new Set(prev).add(selectedId))
    const node = rowRefs.current.get(selectedId)
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [selectedId])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Boxes className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-900">
          No application groups in this document
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {filtered.length} of {groups.length}{" "}
        {groups.length === 1 ? "application group" : "application groups"}
        {normalizedQuery ? ` · “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-400 shadow-sm">
          No application groups match the current search.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((group) => {
            const isOpen = normalizedQuery !== "" || expanded.has(group.id)
            return (
              <div
                key={group.id}
                ref={(node) => {
                  if (node) rowRefs.current.set(group.id, node)
                  else rowRefs.current.delete(group.id)
                }}
                className={cx(
                  "scroll-mt-4 overflow-hidden rounded-xl border bg-white shadow-sm transition-colors",
                  selectedId === group.id ? "border-slate-900" : "border-slate-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <Boxes className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {group.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">ID {group.id}</p>
                  </div>
                  <Badge tone={platformTone(group.platform)}>{group.platform}</Badge>
                  <Badge tone="neutral">
                    {group.memberCount} {group.memberCount === 1 ? "app" : "apps"}
                  </Badge>
                  {group.usedBy.length > 0 ? (
                    <Badge tone="slate">
                      <Users className="h-3 w-3" />
                      {group.usedBy.length}
                    </Badge>
                  ) : null}
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <MembersTable members={group.members} />
                    <UsedByPanel group={group} onOpenPolicy={onOpenPolicy} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ApplicationGroupsView
