import { FileText, LogOut, RotateCcw, ShieldCheck } from "lucide-react"
import { logoutSession } from "../api"
import { clearAuthSession, formatBuildTimestamp, type AuthSession } from "../lib/auth"
import { formatPolicyExportTime } from "../lib/changeId"
import type { PolicyDocumentResponse } from "../types"
import Badge from "./Badge"

interface HeaderProps {
  response?: PolicyDocumentResponse | null
  session: AuthSession
  onReset?: () => void
  onSignOut: () => void
}

const MetaItem = ({
  label,
  value,
  hint,
  title,
}: {
  label: string
  value: string
  hint?: string
  title?: string
}) => (
  <div className="flex min-w-0 flex-col gap-0.5" title={title}>
    <span className="text-[11px] font-medium uppercase leading-none tracking-wide text-slate-400">
      {label}
    </span>
    <span className="text-sm font-medium leading-tight text-slate-800">{value}</span>
    <span className="min-h-[14px] text-[11px] leading-tight text-slate-500">
      {hint ?? "\u00a0"}
    </span>
  </div>
)

const Header = ({ response, session, onReset, onSignOut }: HeaderProps) => {
  const changeId = response?.document.meta.changeId
  const changeIdAt = response?.document.meta.changeIdAt
  const exportTimeLabel = formatPolicyExportTime(changeId, changeIdAt)

  const handleSignOut = async () => {
    await logoutSession().catch(() => clearAuthSession())
    onSignOut()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">
              EPM Policy Viewer
            </h1>
            <p className="text-xs text-slate-500">
              v{session.version} · updated {formatBuildTimestamp(session.lastUpdated)}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-start justify-end gap-x-4 gap-y-3">
          {response ? (
            <div className="flex items-start gap-2.5 self-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="max-w-[16rem] truncate text-sm font-semibold text-slate-900">
                    {response.fileName}
                  </span>
                  {response.source === "default" ? (
                    <Badge tone="blue">Default standard</Badge>
                  ) : (
                    <Badge tone="emerald">Uploaded</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {response.document.meta.policyCount} policies parsed
                </p>
              </div>
            </div>
          ) : null}

          {response?.document.meta.version || exportTimeLabel || changeId ? (
            <div className="hidden items-start gap-x-6 self-center lg:flex">
              {response?.document.meta.version ? (
                <MetaItem label="Version" value={response.document.meta.version} />
              ) : null}
              {exportTimeLabel || changeId ? (
                <MetaItem
                  label="Server sent"
                  value={exportTimeLabel ?? changeId ?? "—"}
                  hint={exportTimeLabel && changeId ? `UTC · changeId ${changeId}` : undefined}
                  title={
                    exportTimeLabel && changeId
                      ? `When the EPM server sent this policy pack to agents (UTC). Raw changeId: ${changeId}`
                      : changeId ?? undefined
                  }
                />
              ) : null}
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-2 self-center">
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                aria-label="Load a different policy"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                New
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
