import { AlertCircle, BookMarked, Loader2 } from "lucide-react"
import FileDropzone from "./FileDropzone"

interface LandingProps {
  onFileSelected: (file: File) => void
  onLoadDefault: () => void
  isLoading: boolean
  loadingDefault: boolean
  error: string | null
}

const Landing = ({
  onFileSelected,
  onLoadDefault,
  isLoading,
  loadingDefault,
  error,
}: LandingProps) => (
  <section className="mx-auto max-w-2xl">
    <div className="mb-6 text-center">
      <h2 className="text-xl font-semibold text-slate-900">
        Inspect an EPM Policy
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload a policy export, or open the built-in default policy standard.
      </p>
    </div>

    <FileDropzone onFileSelected={onFileSelected} isLoading={isLoading} />

    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        or
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    <button
      type="button"
      onClick={onLoadDefault}
      disabled={loadingDefault || isLoading}
      aria-label="Load the default policy standard"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loadingDefault ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      ) : (
        <BookMarked className="h-5 w-5 text-slate-500" />
      )}
      {loadingDefault ? "Loading default policy…" : "Load Default Policy (Standard)"}
    </button>

    {error && (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </section>
)

export default Landing
