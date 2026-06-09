import { existsSync, readFileSync } from "fs"
import path from "path"
import express, { type Request, type Response } from "express"
import cors from "cors"
import multer from "multer"
import { decodeXmlBuffer } from "./src/decodeXml"
import {
  extractConfigBaseline,
  extractConsoleDefaults,
  extractExcludeBaseline,
  parsePolicyDocument,
  type ConsoleDefaults,
} from "./src/epm/parsePolicyDocument"

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())

// Resolve the bundled default ("standard") policy across dev (tsx) and built
// (dist) layouts by checking a few candidate locations.
const DEFAULT_POLICY_CANDIDATES = [
  path.resolve(process.cwd(), "data/default_policy.xml"),
  path.resolve(__dirname, "data/default_policy.xml"),
  path.resolve(__dirname, "../data/default_policy.xml"),
]

const resolveDefaultPolicyPath = (): string | null =>
  DEFAULT_POLICY_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null

// Built frontend assets (Cloud Run / production). Dev uses Vite on port 5173.
const PUBLIC_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "public"),
  path.resolve(__dirname, "../public"),
]

const resolvePublicDir = (): string | null =>
  PUBLIC_DIR_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null

// The bundled default policy's configuration is the "standard" baseline used to
// detect customized settings. Parse it once and cache the path->value map.
let baselineCache: Record<string, string> | undefined
const getDefaultBaseline = (): Record<string, string> | undefined => {
  if (baselineCache) return baselineCache
  const filePath = resolveDefaultPolicyPath()
  if (!filePath) return undefined
  try {
    baselineCache = extractConfigBaseline(decodeXmlBuffer(readFileSync(filePath)))
    return baselineCache
  } catch (error) {
    console.error("Failed to build default config baseline:", error)
    return undefined
  }
}

let excludeBaselineCache: Map<string, Set<string>> | undefined
const getExcludeBaseline = (): Map<string, Set<string>> | undefined => {
  if (excludeBaselineCache) return excludeBaselineCache
  const filePath = resolveDefaultPolicyPath()
  if (!filePath) return undefined
  try {
    excludeBaselineCache = extractExcludeBaseline(decodeXmlBuffer(readFileSync(filePath)))
    return excludeBaselineCache
  } catch (error) {
    console.error("Failed to build exclude policy baseline:", error)
    return undefined
  }
}

const getParseOptions = () => ({
  baseline: getDefaultBaseline(),
  consoleDefaults: getConsoleDefaults(),
  excludeBaseline: getExcludeBaseline(),
})

// EPM console "default configuration" exports (JSON) that name the default
// application groups and policies. Used to flag baseline items so the
// "Customized only" filter can hide them. Merge across files and cache.
const CONSOLE_DEFAULT_FILES = [
  "default_app_group.json",
  "default_policy_console.json",
]

const resolveDataFile = (file: string): string | null =>
  [
    path.resolve(process.cwd(), "data", file),
    path.resolve(__dirname, "data", file),
    path.resolve(__dirname, "../data", file),
  ].find((candidate) => existsSync(candidate)) ?? null

let consoleDefaultsCache: ConsoleDefaults | undefined
const getConsoleDefaults = (): ConsoleDefaults | undefined => {
  if (consoleDefaultsCache) return consoleDefaultsCache
  const appGroupNames = new Set<string>()
  const policyNames = new Set<string>()
  let found = false
  for (const file of CONSOLE_DEFAULT_FILES) {
    const filePath = resolveDataFile(file)
    if (!filePath) continue
    try {
      const defaults = extractConsoleDefaults(readFileSync(filePath, "utf8"))
      defaults.appGroupNames.forEach((name) => appGroupNames.add(name))
      defaults.policyNames.forEach((name) => policyNames.add(name))
      found = true
    } catch (error) {
      console.error(`Failed to load console defaults from ${file}:`, error)
    }
  }
  if (!found) return undefined
  consoleDefaultsCache = { appGroupNames, policyNames }
  return consoleDefaultsCache
}

// Raw XML is fetched on demand (Raw XML tab) so the main parse response stays smaller.
let cachedUploadXml: string | null = null

const getDefaultPolicyXml = (): string | null => {
  const filePath = resolveDefaultPolicyPath()
  if (!filePath) return null
  try {
    return decodeXmlBuffer(readFileSync(filePath)).replace(/^\uFEFF/, "").trim()
  } catch (error) {
    console.error("Failed to read default policy XML:", error)
    return null
  }
}

// Keep the uploaded XML in memory; we only need to parse it, not persist it.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isXml =
      file.mimetype.includes("xml") || file.originalname.toLowerCase().endsWith(".xml")
    if (!isXml) {
      cb(new Error("Only XML files are accepted"))
      return
    }
    cb(null, true)
  },
})

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" })
})

app.get("/api/default-policy", (_req: Request, res: Response) => {
  const filePath = resolveDefaultPolicyPath()
  if (!filePath) {
    res.status(404).json({ error: "Bundled default policy file was not found" })
    return
  }

  try {
    const xml = decodeXmlBuffer(readFileSync(filePath))
    const document = parsePolicyDocument(xml, getParseOptions())
    res.json({ document, source: "default", fileName: "default_policy.xml" })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("Failed to parse default policy:", error)
    res.status(500).json({ error: "Unable to parse the bundled default policy", detail })
  }
})

app.get("/api/raw-xml", (req: Request, res: Response) => {
  const source = req.query.source === "default" ? "default" : "upload"
  const xml =
    source === "default" ? getDefaultPolicyXml() : cachedUploadXml

  if (!xml) {
    res.status(404).json({
      error:
        source === "default"
          ? "Bundled default policy file was not found"
          : "No uploaded XML is available",
    })
    return
  }

  res.json({ xml, source })
})

app.post("/api/upload-xml", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No XML file was provided" })
    return
  }

  try {
    const xml = decodeXmlBuffer(req.file.buffer).replace(/^\uFEFF/, "").trim()
    cachedUploadXml = xml
    const document = parsePolicyDocument(xml, getParseOptions())
    res.json({ document, source: "upload", fileName: req.file.originalname })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("Failed to parse XML:", error)
    res.status(422).json({
      error: "Unable to parse the provided XML file",
      detail,
    })
  }
})

const publicDir = resolvePublicDir()
if (publicDir) {
  app.use(express.static(publicDir))
  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api")) {
      next()
      return
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err)
    })
  })
}

// Centralised error handler (e.g. multer rejections like wrong file type).
app.use((error: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(400).json({ error: error.message })
})

app.listen(PORT, () => {
  console.log(`EPM Policy Viewer backend listening on http://localhost:${PORT}`)
  if (publicDir) console.log(`Serving frontend from ${publicDir}`)
})
