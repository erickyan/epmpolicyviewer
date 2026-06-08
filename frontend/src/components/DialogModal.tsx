import { useEffect, useState } from "react"
import { Code2, Eye, Monitor, X } from "lucide-react"
import type { GuiDialog } from "../types"
import { cx, platformTone } from "../lib/ui"
import Badge from "./Badge"

type ModalTab = "preview" | "source"

interface DialogModalProps {
  dialog: GuiDialog
  onClose: () => void
}

const DialogModal = ({ dialog, onClose }: DialogModalProps) => {
  const [tab, setTab] = useState<ModalTab>("preview")

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${dialog.name} dialog preview`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {dialog.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={platformTone(dialog.os)}>
                <Monitor className="h-3 w-3" />
                {dialog.os}
              </Badge>
              {dialog.typeLabel ? <Badge tone="slate">{dialog.typeLabel}</Badge> : null}
              {dialog.isDefault ? <Badge tone="emerald">Default</Badge> : null}
            </div>
            {dialog.usedBy.length > 0 ? (
              <p className="mt-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Used by:</span>{" "}
                {dialog.usedBy.map((policy) => policy.name).join(", ")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog preview"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-200 px-5 pt-3">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cx(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === "preview"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab("source")}
            className={cx(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === "source"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Code2 className="h-4 w-4" />
            Source
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
          {tab === "preview" ? (
            <div className="p-4">
              <iframe
                // sandbox="" disables scripts & same-origin: the dialog's EPM
                // host scripts can't run here, so we render it inert and safe.
                sandbox=""
                title={`${dialog.name} preview`}
                srcDoc={dialog.html}
                className="h-[60vh] w-full rounded-lg border border-slate-200 bg-white"
              />
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Rendered inertly (scripts disabled). The agent substitutes live
                values & runtime behavior.
              </p>
            </div>
          ) : (
            <pre className="overflow-auto p-4 text-xs leading-relaxed text-slate-700">
              <code>{dialog.sourceHtml}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

export default DialogModal
