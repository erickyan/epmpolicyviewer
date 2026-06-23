import { FileText, LogOut, RotateCcw, ShieldCheck } from "lucide-react"
import { logoutSession } from "../api"
import { clearAuthSession, formatBuildTimestamp, type AuthSession } from "../lib/auth"
import type { PolicyDocumentResponse } from "../types"
import Badge from "./Badge"

interface HeaderProps {
  response?: PolicyDocumentResponse | null
  session: AuthSession
  onReset?: () => void
  onSignOut: () => void
}

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <div className="hidden flex-col lg:flex">
    <span className="text-[11px] uppercase tracking-wide text-slate-400">
      {label}
    </span>
    <span className="text-sm font-medium text-slate-800">{value}</span>
  </div>
)

const Header = ({ response, session, onReset, onSignOut }: HeaderProps) => {
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

        <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-3">
          {response ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div className="min-w-0">
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

          {response?.document.meta.version ? (
            <MetaItem label="Version" value={response.document.meta.version} />
          ) : null}
          {response?.document.meta.changeId ? (
            <MetaItem label="Change ID" value={response.document.meta.changeId} />
          ) : null}

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
    </header>
  )
}

export default Header
