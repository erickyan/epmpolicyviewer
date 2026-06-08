import { useState } from "react"
import { Check, Copy } from "lucide-react"

interface RawXmlViewProps {
  xml: string
}

const RawXmlView = ({ xml }: RawXmlViewProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const lineCount = xml.split("\n").length

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500">
          {lineCount.toLocaleString()} lines ·{" "}
          {xml.length.toLocaleString()} characters
        </p>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy raw XML to clipboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[70vh] overflow-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        <code>{xml}</code>
      </pre>
    </div>
  )
}

export default RawXmlView
