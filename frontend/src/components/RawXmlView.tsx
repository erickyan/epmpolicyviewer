import { useMemo, useState } from "react"
import { Check, ChevronsDownUp, ChevronsUpDown, Copy } from "lucide-react"
import XmlTreeView from "./XmlTreeView"
import { cx } from "../lib/ui"

interface RawXmlViewProps {
  xml: string
}

type ViewMode = "tree" | "source"

const RawXmlView = ({ xml }: RawXmlViewProps) => {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("tree")
  const [collapseToken, setCollapseToken] = useState(0)
  const [expandToken, setExpandToken] = useState(0)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const lineCount = useMemo(() => xml.split("\n").length, [xml])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {lineCount.toLocaleString()} lines ·{" "}
            {xml.length.toLocaleString()} characters
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "tree" ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpandToken((value) => value + 1)}
                  aria-label="Expand all XML tags"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={() => setCollapseToken((value) => value + 1)}
                  aria-label="Collapse all XML tags"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  Collapse all
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy raw XML to clipboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Decoded upload content (UTF-16 converted to UTF-8 when needed, BOM stripped).
            Semantically the same as your file; not a byte-for-byte copy.
          </p>
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="tablist"
            aria-label="XML view mode"
          >
            {(["tree", "source"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={cx(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {mode === "tree" ? "Tree" : "Source"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "tree" ? (
        <XmlTreeView
          xml={xml}
          collapseToken={collapseToken}
          expandToken={expandToken}
        />
      ) : (
        <pre className="max-h-[70vh] overflow-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          <code>{xml}</code>
        </pre>
      )}
    </div>
  )
}

export default RawXmlView
