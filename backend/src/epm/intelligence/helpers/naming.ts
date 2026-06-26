// Heuristic checks aligned with CyberArk application policy naming guidelines:
// [Bundle] – [Applications] – [Descriptor]

const CYBERARK_NAMING_PATTERN = /^\[[^\]]+\]\s*[–-]\s*.+/

const STANDARD_NAME_PATTERNS = [
  CYBERARK_NAMING_PATTERN,
  /Main Default Policy|Default MAC Policy|Default Policy/i,
  /Trusted Publisher/i,
  /^Installed by:/i,
  /^\[.*\]$/,
]

const STANDARD_NAME_PREFIXES =
  /^(Allow|Block|Elevate|Monitor|Exclude|Detect|CTEC|ENG|Bloomberg|PISD)/i

export const hasStandardPolicyName = (name: string): boolean => {
  const trimmed = name.trim()
  if (!trimmed) return false

  if (STANDARD_NAME_PREFIXES.test(trimmed)) return true
  return STANDARD_NAME_PATTERNS.some((pattern) => pattern.test(trimmed))
}
