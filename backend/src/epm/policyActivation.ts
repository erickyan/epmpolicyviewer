import type { PolicyActivation, PolicyActivationSchedule } from "../types"

type XmlNode = Record<string, unknown>

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

const WEEKDAY_NAME_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const getText = (node: unknown): string | undefined => {
  if (node === undefined || node === null) return undefined
  if (typeof node === "boolean") return node ? "true" : "false"
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (typeof node !== "object") return undefined
  const record = node as XmlNode
  if (record["#text"] !== undefined) return String(record["#text"])
  return undefined
}

const readBooleanField = (
  node: XmlNode | undefined,
  ...names: string[]
): boolean | undefined => {
  if (!node) return undefined

  for (const name of names) {
    const child = node[name]
    if (typeof child === "boolean") return child
    const parsed = parseBooleanValue(getText(child))
    if (parsed !== undefined) return parsed
    const attribute = parseBooleanValue(attr(node, name))
    if (attribute !== undefined) return attribute
  }

  return undefined
}

const attr = (node: XmlNode | undefined, name: string): string | undefined => {
  if (!node) return undefined
  const value = node[`@_${name}`]
  if (value === undefined || value === null) return undefined
  return String(value)
}

const readField = (
  node: XmlNode | undefined,
  ...names: string[]
): string | undefined => {
  if (!node) return undefined

  for (const name of names) {
    const child = node[name]
    const text = getText(child)?.trim()
    if (text) return text

    const attribute = attr(node, name)
    if (attribute?.trim()) return attribute.trim()
  }

  return undefined
}

const parseBooleanValue = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (["true", "1", "yes"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  return undefined
}

const parseBooleanTokens = (raw: string): boolean[] | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  if (/^[01]{7}$/.test(trimmed)) {
    return trimmed.split("").map((token) => token === "1")
  }

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((part) => part.trim())
    if (parts.length === 7) {
      return parts.map((part) => parseBooleanValue(part) ?? false)
    }
  }

  return undefined
}

const parseWeekdayNames = (raw: string): boolean[] | undefined => {
  const days = Array.from({ length: 7 }, () => false)
  let matched = false

  for (const token of raw.split(/[,;\s]+/)) {
    const normalized = token.trim().toLowerCase()
    if (!normalized) continue

    const index = WEEKDAY_NAME_TO_INDEX[normalized]
    if (index === undefined) continue

    days[index] = true
    matched = true
  }

  return matched ? days : undefined
}

const parseSchedulerDaysNode = (schedulerNode: XmlNode): boolean[] | undefined => {
  const rawDays = schedulerNode.SchedulerDays
  if (
    Array.isArray(rawDays) &&
    rawDays.length === 7 &&
    rawDays.every((value) => typeof value === "boolean")
  ) {
    return rawDays
  }

  const attributeValue =
    attr(schedulerNode, "SchedulerDays") ??
    attr(schedulerNode, "schedulerDays") ??
    attr(schedulerNode, "weekdays")

  if (attributeValue) {
    const fromTokens = parseBooleanTokens(attributeValue)
    if (fromTokens) return fromTokens

    const fromNames = parseWeekdayNames(attributeValue)
    if (fromNames) return fromNames
  }

  const dayAttributes = DAY_LABELS.map((_, index) => {
    const keys = [
      DAY_LABELS[index].toLowerCase(),
      Object.keys(WEEKDAY_NAME_TO_INDEX).find(
        (key) => WEEKDAY_NAME_TO_INDEX[key] === index && key.length > 3
      ),
    ].filter(Boolean) as string[]

    for (const key of keys) {
      const value = parseBooleanValue(attr(schedulerNode, key))
      if (value !== undefined) return value
    }

    return undefined
  })

  if (dayAttributes.some((value) => value !== undefined)) {
    return dayAttributes.map((value) => value ?? false)
  }

  const repeatedDays = asArray(rawDays as XmlNode | XmlNode[] | string | string[] | boolean | boolean[] | undefined)
    .map((node) => {
      if (typeof node === "boolean") return node
      return parseBooleanValue(getText(node))
    })
    .filter((value): value is boolean => value !== undefined)

  if (repeatedDays.length === 7) return repeatedDays

  if (repeatedDays.length === 1) {
    const singleNode = schedulerNode.SchedulerDays
    const singleText = getText(singleNode)?.trim()
    if (singleText) {
      const fromTokens = parseBooleanTokens(singleText)
      if (fromTokens) return fromTokens
    }
  }

  return undefined
}

const activeDayLabels = (schedulerDays: boolean[]): string[] =>
  DAY_LABELS.filter((_, index) => schedulerDays[index])

const parseScheduler = (
  activationNode: XmlNode | undefined
): PolicyActivationSchedule | undefined => {
  const schedulerNode = activationNode?.Scheduler as XmlNode | undefined
  if (!schedulerNode || typeof schedulerNode !== "object") return undefined

  const schedulerDays =
    parseSchedulerDaysNode(schedulerNode) ??
    Array.from({ length: 7 }, () => true)

  const isFullDay =
    parseBooleanValue(
      attr(schedulerNode, "IsFullDay") ?? attr(schedulerNode, "isFullDay")
    ) ??
    readBooleanField(schedulerNode, "IsFullDay", "isFullDay")

  const startTime = readField(schedulerNode, "StartTime", "startTime")
  const endTime = readField(schedulerNode, "EndTime", "endTime")

  const hasSpecificTimes =
    isFullDay === false ||
    !!startTime ||
    !!endTime ||
    schedulerDays.some((enabled, index) => !enabled)

  const allDaysEnabled = schedulerDays.every(Boolean)

  return {
    schedulerDays,
    dayLabels: activeDayLabels(schedulerDays),
    startTime,
    endTime,
    isFullDay,
    mode:
      hasSpecificTimes || !allDaysEnabled ? "specific-times" : "anytime",
  }
}

const buildActivationSummary = (activation: Omit<PolicyActivation, "summary">): string[] => {
  const lines: string[] = []

  if (activation.activateDate) {
    lines.push(`Enforcement starts: ${activation.activateDate}`)
  }

  if (activation.deactivateDate) {
    lines.push(`Enforcement ends: ${activation.deactivateDate}`)
  }

  if (activation.scheduler) {
    if (activation.scheduler.mode === "anytime") {
      lines.push("Enforcement timetable: Anytime (all days)")
    } else {
      lines.push(
        `Enforcement timetable: ${activation.scheduler.dayLabels.join(", ") || "No days selected"}`
      )
      if (activation.scheduler.isFullDay) {
        lines.push("Daily window: Full day")
      } else if (activation.scheduler.startTime || activation.scheduler.endTime) {
        lines.push(
          `Daily window: ${activation.scheduler.startTime ?? "?"} – ${activation.scheduler.endTime ?? "?"}`
        )
      }
    }
  }

  if (activation.autoDelete) {
    lines.push("Automatic policy deletion is enabled (3 months after end date)")
  }

  lines.push("Schedule uses endpoint local time zone")

  return lines
}

export const parsePolicyActivation = (
  policy: XmlNode
): PolicyActivation | undefined => {
  const activationNode = policy.Activation as XmlNode | undefined
  if (!activationNode || typeof activationNode !== "object") return undefined

  const activateDate = readField(activationNode, "ActivateDate", "activateDate")
  const deactivateDate = readField(
    activationNode,
    "DeactivateDate",
    "deactivateDate"
  )
  const autoDelete = readBooleanField(activationNode, "AutoDelete", "autoDelete")
  const scheduler = parseScheduler(activationNode)

  if (
    !activateDate &&
    !deactivateDate &&
    autoDelete === undefined &&
    !scheduler
  ) {
    return undefined
  }

  const activation: Omit<PolicyActivation, "summary"> = {
    enabled: true,
    activateDate,
    deactivateDate,
    autoDelete,
    scheduler,
  }

  return {
    ...activation,
    summary: buildActivationSummary(activation),
  }
}

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

export const POLICY_WEEKDAY_LABELS = DAY_LABELS
