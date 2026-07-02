import type { PolicyActivation, PolicyActivationSchedule } from "../types"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export const POLICY_WEEKDAY_LABELS = DAY_LABELS

export const formatPolicyDateTime = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  })
}

export const formatPolicyTimeOfDay = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined

  const timePart = value.includes("T") ? value.split("T")[1] : value
  const parsed = new Date(`1970-01-01T${timePart}`)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export const getSchedulerModeLabel = (
  scheduler?: PolicyActivationSchedule
): string => {
  if (!scheduler) return "Anytime (default)"
  return scheduler.mode === "specific-times"
    ? "At specific times"
    : "Anytime (default)"
}

export const getActivationEnabledLabel = (activation: PolicyActivation): string =>
  activation.enabled ? "On" : "Off"

export const getAutoDeleteLabel = (autoDelete?: boolean): string =>
  autoDelete ? "On" : "Off (default)"

export const getPeriodToggleLabel = (value?: string): string =>
  value ? "On" : "Off"

export const getFullDayLabel = (isFullDay?: boolean): string =>
  isFullDay ? "Full day" : "Custom window"

export const getDailyWindowLabel = (
  scheduler?: PolicyActivationSchedule
): string | undefined => {
  if (!scheduler) return undefined
  if (scheduler.isFullDay) {
    return `${formatPolicyTimeOfDay("1970-01-01T00:00:00") ?? "12:00 AM"} – ${formatPolicyTimeOfDay("1970-01-01T23:59:59") ?? "11:59 PM"}`
  }

  const start = formatPolicyTimeOfDay(scheduler.startTime)
  const end = formatPolicyTimeOfDay(scheduler.endTime)
  if (!start && !end) return undefined
  return `${start ?? "?"} – ${end ?? "?"}`
}
