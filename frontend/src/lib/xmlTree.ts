export type XmlTreeNode =
  | {
      type: "element"
      path: string
      name: string
      attributes: Record<string, string>
      children: XmlTreeNode[]
    }
  | {
      type: "text"
      path: string
      value: string
    }
  | {
      type: "comment"
      path: string
      value: string
    }

export interface XmlTreeResult {
  root: XmlTreeNode | null
  error: string | null
}

const isElement = (node: XmlTreeNode): node is Extract<XmlTreeNode, { type: "element" }> =>
  node.type === "element"

export const hasElementChildren = (node: XmlTreeNode): boolean =>
  isElement(node) && node.children.some((child) => child.type === "element")

export const collectCollapsiblePaths = (
  node: XmlTreeNode,
  includeRoot = false
): string[] => {
  const paths: string[] = []
  const walk = (current: XmlTreeNode, isRoot: boolean) => {
    if (!isElement(current)) return
    if ((!isRoot || includeRoot) && hasElementChildren(current)) {
      paths.push(current.path)
    }
    for (const child of current.children) walk(child, false)
  }
  walk(node, true)
  return paths
}

export const getDefaultCollapsedPaths = (root: XmlTreeNode): Set<string> => {
  const paths = collectCollapsiblePaths(root, false)
  return new Set(paths)
}

export const LARGE_TREE_NODE_THRESHOLD = 300

export const getCollapsedBeyondDepth = (
  root: XmlTreeNode,
  maxDepth: number
): Set<string> =>
  new Set(
    collectCollapsiblePaths(root, true).filter(
      (path) => path.split("/").length - 1 >= maxDepth
    )
  )

const walkDom = (node: Node, path: string, nextIndex: () => number): XmlTreeNode | null => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element
    const attributes: Record<string, string> = {}
    for (const attribute of Array.from(element.attributes)) {
      attributes[attribute.name] = attribute.value
    }

    const children: XmlTreeNode[] = []
    for (const child of Array.from(element.childNodes)) {
      const childPath = `${path}/${nextIndex()}`
      const walked = walkDom(child, childPath, nextIndex)
      if (walked) children.push(walked)
    }

    return {
      type: "element",
      path,
      name: element.tagName,
      attributes,
      children,
    }
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent?.replace(/\s+/g, " ").trim() ?? ""
    if (!value) return null
    return { type: "text", path, value }
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    const value = node.textContent?.trim() ?? ""
    if (!value) return null
    return { type: "comment", path, value }
  }

  return null
}

export const parseXmlTree = (xml: string): XmlTreeResult => {
  if (!xml.trim()) {
    return { root: null, error: "No XML content to display." }
  }

  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const parseError = doc.querySelector("parsererror")
  if (parseError) {
    return {
      root: null,
      error: parseError.textContent?.trim() || "Unable to parse XML for tree view.",
    }
  }

  const documentElement = doc.documentElement
  if (!documentElement) {
    return { root: null, error: "XML document has no root element." }
  }

  let index = 0
  const nextIndex = () => index++
  const root = walkDom(documentElement, "0", nextIndex)
  return { root, error: null }
}

export const formatAttributePreview = (
  attributes: Record<string, string>,
  maxAttrs = 6,
  maxValueLength = 48
): string => {
  const entries = Object.entries(attributes)
  if (entries.length === 0) return ""

  const preview = entries.slice(0, maxAttrs).map(([name, value]) => {
    const trimmed =
      value.length > maxValueLength ? `${value.slice(0, maxValueLength)}…` : value
    return `${name}="${trimmed}"`
  })

  const suffix =
    entries.length > maxAttrs ? ` +${entries.length - maxAttrs} more` : ""
  return `${preview.join(" ")}${suffix}`
}

export const normalizeXmlSearchQuery = (query: string): string =>
  query.trim().toLowerCase()

export const nodeMatchesXmlSearch = (
  node: XmlTreeNode,
  query: string
): boolean => {
  const normalized = normalizeXmlSearchQuery(query)
  if (!normalized) return false

  if (node.type === "element") {
    if (node.name.toLowerCase().includes(normalized)) return true
    return Object.entries(node.attributes).some(
      ([name, value]) =>
        name.toLowerCase().includes(normalized) ||
        value.toLowerCase().includes(normalized)
    )
  }

  return node.value.toLowerCase().includes(normalized)
}

export interface XmlSearchTreeState {
  relevantPaths: Set<string> | null
  collapsedPaths: Set<string>
  matchCount: number
}

export const buildXmlSearchTreeState = (
  root: XmlTreeNode,
  query: string
): XmlSearchTreeState => {
  const normalized = normalizeXmlSearchQuery(query)
  if (!normalized) {
    return {
      relevantPaths: null,
      collapsedPaths: getDefaultCollapsedPaths(root),
      matchCount: 0,
    }
  }

  const relevantPaths = new Set<string>()
  let matchCount = 0

  const walk = (node: XmlTreeNode): boolean => {
    const selfMatch = nodeMatchesXmlSearch(node, query)
    if (selfMatch) matchCount += 1

    let childRelevant = false
    if (node.type === "element") {
      for (const child of node.children) {
        if (walk(child)) childRelevant = true
      }
    }

    const keep = selfMatch || childRelevant
    if (keep) relevantPaths.add(node.path)
    return keep
  }

  walk(root)

  const allCollapsible = collectCollapsiblePaths(root, true)
  const collapsedPaths = new Set(
    allCollapsible.filter((path) => !relevantPaths.has(path))
  )

  return { relevantPaths, collapsedPaths, matchCount }
}
