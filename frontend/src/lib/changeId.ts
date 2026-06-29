// Mirrors backend/src/epm/changeId.ts for client-side display when only raw changeId is available.

const SQL_DATETIME_EPOCH_MS = Date.UTC(1900, 0, 1)
const MS_PER_DAY = 86_400_000
const TICKS_PER_SECOND = 300

export const decodePolicyChangeId = (changeId: string | undefined): Date | null => {
  if (!changeId?.trim()) return null

  let packed: bigint
  try {
    packed = BigInt(changeId.trim())
  } catch {
    return null
  }

  if (packed < 0n) return null

  const dayCount = Number(packed >> 32n)
  const timeTicks = Number(packed & 0xffffffffn)

  if (!Number.isFinite(dayCount) || !Number.isFinite(timeTicks)) return null
  if (dayCount < 0 || dayCount > 500_000) return null
  if (timeTicks < 0 || timeTicks >= MS_PER_DAY / 1000 * TICKS_PER_SECOND) return null

  const timestampMs =
    SQL_DATETIME_EPOCH_MS +
    dayCount * MS_PER_DAY +
    Math.round((timeTicks / TICKS_PER_SECOND) * 1000)

  const decoded = new Date(timestampMs)
  if (Number.isNaN(decoded.getTime())) return null
  return decoded
}

const formatPolicyExportDate = (
  date: Date,
  locale = "en-US",
  timeZone = "UTC"
): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date)

export const formatPolicyChangeId = (
  changeId: string | undefined,
  locale = "en-US",
  timeZone = "UTC"
): string | null => {
  const decoded = decodePolicyChangeId(changeId)
  if (!decoded) return null

  return formatPolicyExportDate(decoded, locale, timeZone)
}

export const formatPolicyExportTime = (
  changeId: string | undefined,
  changeIdAt: string | undefined,
  locale = "en-US",
  timeZone = "UTC"
): string | null => {
  if (changeIdAt) {
    const parsed = new Date(changeIdAt)
    if (!Number.isNaN(parsed.getTime())) {
      return formatPolicyExportDate(parsed, locale, timeZone)
    }
  }

  return formatPolicyChangeId(changeId, locale, timeZone)
}
