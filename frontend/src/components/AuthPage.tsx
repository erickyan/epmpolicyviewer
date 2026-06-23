import { useEffect, useState } from "react"
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, ShieldAlert, ShieldCheck } from "lucide-react"
import { fetchAppMeta, loginWithPassphrase } from "../api"
import {
  formatBuildTimestamp,
  loadAuthSession,
  saveAuthSession,
  type AuthSession,
  type AppMeta,
} from "../lib/auth"
import { cx } from "../lib/ui"
import Badge from "./Badge"

interface AuthPageProps {
  onAuthenticated: (session: AuthSession) => void
}

const AuthPage = ({ onAuthenticated }: AuthPageProps) => {
  const [meta, setMeta] = useState<AppMeta | null>(() => loadAuthSession())
  const [passphrase, setPassphrase] = useState("")
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (meta) return
    fetchAppMeta()
      .then(setMeta)
      .catch(() => {
        setMeta({ version: "unknown", lastUpdated: new Date().toISOString() })
      })
  }, [meta])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!passphrase.trim()) {
      setError("Enter the access passphrase to continue.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const session = await loginWithPassphrase(passphrase.trim())
      saveAuthSession(session)
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">EPM Policy Viewer</h1>
            <p className="text-xs text-slate-500">Authorized access required</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Restricted internal tool</p>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90">
                  <li>Access is limited to authorized CyberArk personnel only.</li>
                  <li>
                    Policy XML may contain sensitive tenant configuration — do not share exports,
                    screenshots, or access credentials.
                  </li>
                  <li>
                    Unauthorized access, credential sharing, or misuse may violate company policy
                    and applicable data-protection requirements.
                  </li>
                  <li>Sessions expire automatically after 8 hours of inactivity.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge tone="slate">Version {meta?.version ?? "…"}</Badge>
              <Badge tone="blue">
                Last system update{" "}
                {meta ? formatBuildTimestamp(meta.lastUpdated) : "loading…"}
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="access-passphrase"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Access passphrase
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="access-passphrase"
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    autoComplete="current-password"
                    aria-describedby={error ? "auth-error" : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase((current) => !current)}
                    aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    {showPassphrase ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  id="auth-error"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cx(
                  "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isSubmitting ? "Verifying access…" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Your session records the application version and last system update time shown above.
              Contact your CyberArk administrator if you need access or believe you reached this
              page in error.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AuthPage
