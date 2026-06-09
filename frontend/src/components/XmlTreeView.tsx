import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import {
  LARGE_TREE_NODE_THRESHOLD,
  collectCollapsiblePaths,
  formatAttributePreview,
  getCollapsedBeyondDepth,
  getDefaultCollapsedPaths,
  hasElementChildren,
  parseXmlTree,
  type XmlTreeNode,
} from "../lib/xmlTree"
import { cx } from "../lib/ui"

interface XmlTreeViewProps {
  xml: string
  collapseToken: number
  expandToken: number
}

const countElementChildren = (node: XmlTreeNode): number =>
  node.type === "element"
    ? node.children.filter((child) => child.type === "element").length
    : 0

const XmlElementNode = memo(({
  node,
  collapsedPaths,
  onToggle,
}: {
  node: Extract<XmlTreeNode, { type: "element" }>
  collapsedPaths: Set<string>
  onToggle: (path: string) => void
}) => {
  const collapsible = hasElementChildren(node)
  const isCollapsed = collapsible && collapsedPaths.has(node.path)
  const childElements = countElementChildren(node)
  const attributePreview = formatAttributePreview(node.attributes)

  return (
    <div className="font-mono text-[11px] leading-5">
      <div className="group flex items-start gap-1 rounded px-1 hover:bg-slate-800/60">
        {collapsible ? (
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed
                ? `Expand ${node.name} element`
                : `Collapse ${node.name} element`
            }
            className="mt-0.5 inline-flex shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block w-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1 whitespace-pre-wrap break-all">
          <span className="text-sky-300">&lt;{node.name}</span>
          {attributePreview ? (
            <span className="text-violet-300"> {attributePreview}</span>
          ) : null}
          {isCollapsed ? (
            <>
              <span className="text-sky-300"> …&gt;</span>
              <span className="ml-2 text-slate-500">
                {childElements} {childElements === 1 ? "child" : "children"}
              </span>
            </>
          ) : (
            <span className="text-sky-300">&gt;</span>
          )}
        </div>
      </div>

      {!isCollapsed ? (
        <div className="ml-5 border-l border-slate-700/80 pl-2">
          {node.children.map((child) => (
            <XmlTreeNodeRow
              key={child.path}
              node={child}
              collapsedPaths={collapsedPaths}
              onToggle={onToggle}
            />
          ))}
          <div className="px-1 text-sky-300">
            &lt;/{node.name}&gt;
          </div>
        </div>
      ) : null}
    </div>
  )
})

XmlElementNode.displayName = "XmlElementNode"

const XmlTreeNodeRow = memo(({
  node,
  collapsedPaths,
  onToggle,
}: {
  node: XmlTreeNode
  collapsedPaths: Set<string>
  onToggle: (path: string) => void
}) => {
  if (node.type === "element") {
    return (
      <XmlElementNode
        node={node}
        collapsedPaths={collapsedPaths}
        onToggle={onToggle}
      />
    )
  }

  if (node.type === "comment") {
    return (
      <div className="px-1 text-slate-500">
        {`<!-- ${node.value} -->`}
      </div>
    )
  }

  return (
    <div className="px-1 text-emerald-200/90">
      {node.value}
    </div>
  )
})

XmlTreeNodeRow.displayName = "XmlTreeNodeRow"

const XmlTreeView = ({ xml, collapseToken, expandToken }: XmlTreeViewProps) => {
  const [parsed, setParsed] = useState<ReturnType<typeof parseXmlTree> | null>(
    null
  )
  const [parsing, setParsing] = useState(true)
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [expandNotice, setExpandNotice] = useState<string | null>(null)

  useEffect(() => {
    setParsing(true)
    setParsed(null)
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setParsed(parseXmlTree(xml))
        setParsing(false)
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [xml])

  const root = parsed?.root ?? null
  const error = parsed?.error ?? null

  const collapsibleCount = useMemo(
    () => (root ? collectCollapsiblePaths(root, true).length : 0),
    [root]
  )

  useEffect(() => {
    if (!root) {
      setCollapsedPaths(new Set())
      setExpandNotice(null)
      return
    }
    setCollapsedPaths(getDefaultCollapsedPaths(root))
    setExpandNotice(null)
  }, [root, xml])

  useEffect(() => {
    if (!root || collapseToken === 0) return
    setCollapsedPaths(new Set(collectCollapsiblePaths(root, true)))
    setExpandNotice(null)
  }, [collapseToken, root])

  useEffect(() => {
    if (!root || expandToken === 0) return
    if (collapsibleCount > LARGE_TREE_NODE_THRESHOLD) {
      setCollapsedPaths(getCollapsedBeyondDepth(root, 2))
      setExpandNotice(
        `Large document (${collapsibleCount.toLocaleString()} nodes) — expanded top levels only. Expand individual tags as needed.`
      )
      return
    }
    setCollapsedPaths(new Set())
    setExpandNotice(null)
  }, [collapsibleCount, expandToken, root])

  const handleToggle = useCallback((path: string) => {
    setCollapsedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  if (parsing) {
    return (
      <div className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-16 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Building XML tree…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
        {error}
      </p>
    )
  }

  if (!root || root.type !== "element") {
    return (
      <p className="text-xs text-slate-400">No XML tree to display.</p>
    )
  }

  return (
    <div className="space-y-2">
      {expandNotice ? (
        <p className="border-b border-slate-200 px-4 py-2 text-xs text-amber-700">
          {expandNotice}
        </p>
      ) : null}
      <div
        className={cx(
          "max-h-[70vh] overflow-auto rounded-lg bg-slate-900 p-4",
          "selection:bg-slate-700"
        )}
      >
        <XmlTreeNodeRow
          node={root}
          collapsedPaths={collapsedPaths}
          onToggle={handleToggle}
        />
      </div>
    </div>
  )
}

export default XmlTreeView
