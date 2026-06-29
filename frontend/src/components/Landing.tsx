import { AlertCircle, BookMarked, Laptop, Loader2, Monitor } from "lucide-react"
import type { DefaultPolicyPlatform } from "../types"
import FileDropzone from "./FileDropzone"

interface LandingProps {
  onFileSelected: (file: File) => void
  onLoadDefault: (platform: DefaultPolicyPlatform) => void
  isLoading: boolean
  loadingDefaultPlatform: DefaultPolicyPlatform | null
  error: string | null
}

const defaultPolicyOptions: {
  platform: DefaultPolicyPlatform
  label: string
  description: string
  icon: typeof Laptop
}[] = [
  {
    platform: "mac",
    label: "macOS standard",
    description: "9 policies · Jamf, Intune, macOS excludes",
    icon: Laptop,
  },
  {
    platform: "windows",
    label: "Windows standard",
    description: "22 policies · Allow/Block/Elevate, Windows updaters",
    icon: Monitor,
  },
]

const Landing = ({
  onFileSelected,
  onLoadDefault,
  isLoading,
  loadingDefaultPlatform,
  error,
}: LandingProps) => (
  <section className="mx-auto max-w-2xl">
    <div className="mb-6 text-center">
      <h2 className="text-xl font-semibold text-slate-900">
        Inspect an EPM Policy
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload a policy export, or open a built-in out-of-box standard.
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

    <div className="grid gap-3 sm:grid-cols-2">
      {defaultPolicyOptions.map(({ platform, label, description, icon: Icon }) => {
        const isLoadingDefault = loadingDefaultPlatform === platform
        const isDisabled = loadingDefaultPlatform !== null || isLoading

        return (
          <button
            key={platform}
            type="button"
            onClick={() => onLoadDefault(platform)}
            disabled={isDisabled}
            aria-label={`Load the ${label} policy`}
            className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex w-full items-center gap-2">
              {isLoadingDefault ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              ) : (
                <Icon className="h-5 w-5 text-slate-500" />
              )}
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              <BookMarked className="ml-auto h-4 w-4 text-slate-400" />
            </div>
            <span className="text-xs leading-relaxed text-slate-500">
              {isLoadingDefault ? "Loading standard policy…" : description}
            </span>
          </button>
        )
      })}
    </div>

    {error && (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </section>
)

export default Landing
