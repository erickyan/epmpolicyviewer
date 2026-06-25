export type XmlTreeNode =
  | {
      type: "element"
      path: string
      name: string
      attributes: Record<string, string>
      children: XmlTreeNode[]
      // All descendant text from the DOM (includes CDATA and nested text nodes).
      textContent?: string
      // Serialized element subtree for full-string search fallback.
      serialized?: string
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

const xmlSerializer =
  typeof XMLSerializer !== "undefined" ? new XMLSerializer() : null

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

    const textContent = element.textContent ?? undefined
    const serialized = xmlSerializer?.serializeToString(element)

    return {
      type: "element",
      path,
      name: element.tagName,
      attributes,
      children,
      textContent: textContent || undefined,
      serialized,
    }
  }

  if (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE
  ) {
    const value = node.textContent ?? ""
    if (!value.trim()) return null
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

export const normalizeForXmlSearch = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim()

export const matchesXmlSearchQuery = (haystack: string, query: string): boolean => {
  const normalizedQuery = normalizeForXmlSearch(query)
  if (!normalizedQuery) return false
  return normalizeForXmlSearch(haystack).includes(normalizedQuery)
}

const elementTagOrAttributeMatches = (
  node: Extract<XmlTreeNode, { type: "element" }>,
  query: string
): boolean => {
  if (matchesXmlSearchQuery(node.name, query)) return true
  return Object.entries(node.attributes).some(
    ([name, value]) =>
      matchesXmlSearchQuery(name, query) || matchesXmlSearchQuery(value, query)
  )
}

export const nodeMatchesXmlSearch = (
  node: XmlTreeNode,
  query: string
): boolean => {
  if (!normalizeXmlSearchQuery(query)) return false

  if (node.type === "text" || node.type === "comment") {
    return matchesXmlSearchQuery(node.value, query)
  }

  return elementTagOrAttributeMatches(node, query)
}

export interface XmlSearchTreeState {
  relevantPaths: Set<string> | null
  collapsedPaths: Set<string>
  matchCount: number
  rawXmlMatchOutsideTree: boolean
  // Elements that matched on tag name or attributes — show their full subtree.
  directMatchPaths: Set<string>
}

const addDescendantPaths = (node: XmlTreeNode, paths: Set<string>) => {
  if (node.type !== "element") return
  for (const child of node.children) {
    paths.add(child.path)
    addDescendantPaths(child, paths)
  }
}

export const buildXmlSearchTreeState = (
  root: XmlTreeNode,
  query: string,
  rawXml?: string
): XmlSearchTreeState => {
  const normalized = normalizeXmlSearchQuery(query)
  if (!normalized) {
    return {
      relevantPaths: null,
      collapsedPaths: getDefaultCollapsedPaths(root),
      matchCount: 0,
      rawXmlMatchOutsideTree: false,
      directMatchPaths: new Set(),
    }
  }

  const relevantPaths = new Set<string>()
  const directMatchPaths = new Set<string>()
  let matchCount = 0

  const walk = (node: XmlTreeNode): boolean => {
    if (node.type === "text" || node.type === "comment") {
      if (!matchesXmlSearchQuery(node.value, query)) return false
      matchCount += 1
      relevantPaths.add(node.path)
      return true
    }

    const tagOrAttrMatch = elementTagOrAttributeMatches(node, query)
    let childRelevant = false
    for (const child of node.children) {
      if (walk(child)) childRelevant = true
    }

    const textContentMatch =
      !childRelevant &&
      !!node.textContent &&
      matchesXmlSearchQuery(node.textContent, query)

    const serializedMatch =
      !childRelevant &&
      !textContentMatch &&
      !!node.serialized &&
      matchesXmlSearchQuery(node.serialized, query)

    if (serializedMatch) {
      for (const child of node.children) {
        walk(child)
      }
      childRelevant = node.children.some((child) => relevantPaths.has(child.path))
    }

    const keep = tagOrAttrMatch || childRelevant || textContentMatch || serializedMatch
    if (!keep) return false

    if (tagOrAttrMatch || textContentMatch || (serializedMatch && !childRelevant)) {
      matchCount += 1
    }

    relevantPaths.add(node.path)

    if (tagOrAttrMatch) {
      directMatchPaths.add(node.path)
      addDescendantPaths(node, relevantPaths)
    }

    return true
  }

  walk(root)

  const allCollapsible = collectCollapsiblePaths(root, true)
  const collapsedPaths = new Set(
    allCollapsible.filter((path) => {
      if (!relevantPaths.has(path)) return true
      // Keep direct-match subtrees expanded at first level; collapse deeper by default.
      for (const directPath of directMatchPaths) {
        if (path.startsWith(`${directPath}/`)) {
          const depth = path.split("/").length - directPath.split("/").length
          return depth > 1
        }
      }
      return false
    })
  )

  return {
    relevantPaths,
    collapsedPaths,
    matchCount,
    directMatchPaths,
    rawXmlMatchOutsideTree:
      matchCount === 0 && !!rawXml && matchesXmlSearchQuery(rawXml, query),
  }
}

export const filterRawXmlLines = (xml: string, query: string): string => {
  if (!normalizeXmlSearchQuery(query)) return xml
  return xml
    .split("\n")
    .filter((line) => matchesXmlSearchQuery(line, query))
    .join("\n")
}

export const countRawXmlLineMatches = (xml: string, query: string): number => {
  if (!normalizeXmlSearchQuery(query)) return 0
  return xml.split("\n").filter((line) => matchesXmlSearchQuery(line, query)).length
}

export const rawXmlContainsSearchQuery = (xml: string, query: string): boolean =>
  matchesXmlSearchQuery(xml, query)
