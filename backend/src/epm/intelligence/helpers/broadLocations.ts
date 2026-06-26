import type { TargetEntry } from "../../../types"
import { normalizePathForMatch } from "./paths"
import { targetHasPublisher } from "./targets"

const BROAD_LOCATION_ENTRIES = [
  "%windir%",
  "%systemroot%",
  "c:\\windows",
  "%programfiles%",
  "%programfiles(x86)%",
  "c:\\program files",
  "c:\\program files (x86)",
  "c:\\",
  "c:",
  "/",
  "/usr",
  "/bin",
  "/sbin",
  "/etc",
  "/var",
  "/opt",
  "/System",
  "/Applications",
]

export const targetLocationValue = (target: TargetEntry): string | undefined =>
  target.location?.trim() || target.locationPattern?.value?.trim()

export const isBroadLocationPath = (rawPath: string): boolean => {
  const normalized = normalizePathForMatch(rawPath)
  if (!normalized) return false

  for (const entry of BROAD_LOCATION_ENTRIES) {
    const protectedNorm = normalizePathForMatch(entry)
    if (!protectedNorm) continue
    if (normalized === protectedNorm) return true
    if (normalized.startsWith(`${protectedNorm}\\`) || normalized.startsWith(`${protectedNorm}/`)) {
      return true
    }
  }

  return false
}

export const targetHasLocationOnlyMatch = (target: TargetEntry): boolean => {
  const location = targetLocationValue(target)
  if (!location) return false
  if (targetHasPublisher(target)) return false
  if (target.bundleId?.trim() || target.bundleIdPattern?.value?.trim()) return false
  if (target.serviceName?.trim()) return false
  if (target.fileVerInfo?.length) return false

  const hasFileName =
    !!target.fileName?.trim() || !!target.fileNamePattern?.value?.trim()
  if (hasFileName) return false

  return isBroadLocationPath(location)
}
