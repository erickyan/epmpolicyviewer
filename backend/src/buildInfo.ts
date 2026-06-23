import { existsSync, readFileSync, statSync } from "fs"
import path from "path"

const readPackageVersion = (): string => {
  const candidates = [
    path.resolve(process.cwd(), "package.json"),
    path.resolve(__dirname, "../package.json"),
    path.resolve(__dirname, "../../package.json"),
  ]
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    try {
      const pkg = JSON.parse(readFileSync(filePath, "utf-8")) as { version?: string }
      if (pkg.version) return pkg.version
    } catch {
      continue
    }
  }
  return "0.0.0"
}

const resolveLastUpdated = (): string => {
  if (process.env.APP_LAST_UPDATED) return process.env.APP_LAST_UPDATED

  const candidates = [
    path.resolve(process.cwd(), "dist/server.js"),
    path.resolve(__dirname, "../server.js"),
    path.resolve(__dirname, "../../server.ts"),
  ]

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    try {
      return statSync(filePath).mtime.toISOString()
    } catch {
      continue
    }
  }

  return new Date().toISOString()
}

export interface AppBuildInfo {
  version: string
  lastUpdated: string
}

export const getAppBuildInfo = (): AppBuildInfo => ({
  version: readPackageVersion(),
  lastUpdated: resolveLastUpdated(),
})
