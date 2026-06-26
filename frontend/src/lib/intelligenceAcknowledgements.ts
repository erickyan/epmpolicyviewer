import { useCallback, useEffect, useState } from "react"
import type { PolicyDocumentMeta, PolicyFinding } from "../types"

const STORAGE_PREFIX = "epm-intelligence-ack:"

export const buildIntelligenceDocumentKey = (
  meta: PolicyDocumentMeta,
  source: string,
  fileName: string
): string =>
  [source, fileName, meta.changeId ?? meta.version ?? "unknown"].join(":")

const readAcknowledgedRuleIds = (documentKey: string): Set<string> => {
  if (typeof window === "undefined") return new Set()

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${documentKey}`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((value) => typeof value === "string" && value.trim()))
  } catch {
    return new Set()
  }
}

const writeAcknowledgedRuleIds = (documentKey: string, ruleIds: Set<string>): void => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${documentKey}`,
    JSON.stringify([...ruleIds])
  )
}

export const filterUnacknowledgedFindings = (
  findings: PolicyFinding[],
  acknowledgedRuleIds: Set<string>
): PolicyFinding[] =>
  findings.filter((finding) => !acknowledgedRuleIds.has(finding.ruleId))

export const useIntelligenceAcknowledgements = (documentKey: string) => {
  const [acknowledgedRuleIds, setAcknowledgedRuleIds] = useState<Set<string>>(() =>
    readAcknowledgedRuleIds(documentKey)
  )

  useEffect(() => {
    setAcknowledgedRuleIds(readAcknowledgedRuleIds(documentKey))
  }, [documentKey])

  const acknowledge = useCallback(
    (ruleId: string) => {
      setAcknowledgedRuleIds((previous) => {
        const next = new Set(previous)
        next.add(ruleId)
        writeAcknowledgedRuleIds(documentKey, next)
        return next
      })
    },
    [documentKey]
  )

  const unacknowledge = useCallback(
    (ruleId: string) => {
      setAcknowledgedRuleIds((previous) => {
        const next = new Set(previous)
        next.delete(ruleId)
        writeAcknowledgedRuleIds(documentKey, next)
        return next
      })
    },
    [documentKey]
  )

  const isAcknowledged = useCallback(
    (ruleId: string) => acknowledgedRuleIds.has(ruleId),
    [acknowledgedRuleIds]
  )

  return {
    acknowledgedRuleIds,
    acknowledge,
    unacknowledge,
    isAcknowledged,
  }
}
