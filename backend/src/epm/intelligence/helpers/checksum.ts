import type { TargetEntry } from "../../../types"
import { targetHasPublisher } from "./targets"

export const targetHasChecksumHash = (target: TargetEntry): boolean =>
  !!target.attributes.hash?.trim()

export const targetHasChecksumOnly = (target: TargetEntry): boolean => {
  if (!targetHasChecksumHash(target)) return false
  if (targetHasPublisher(target)) return false
  if (target.location?.trim() || target.locationPattern?.value?.trim()) return false
  if (target.bundleId?.trim() || target.bundleIdPattern?.value?.trim()) return false
  if (target.serviceName?.trim()) return false
  if (target.fileVerInfo?.length) return false
  return true
}
