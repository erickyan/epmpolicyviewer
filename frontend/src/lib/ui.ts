export type Tone =
  | "neutral"
  | "slate"
  | "blue"
  | "emerald"
  | "amber"
  | "red"
  | "violet"

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ")

export const platformTone = (platform: string): Tone => {
  if (platform === "macOS") return "violet"
  if (platform === "Windows") return "blue"
  if (platform === "Linux") return "amber"
  return "slate"
}

const CATEGORY_TONES: Record<string, Tone> = {
  default: "blue",
  block: "red",
  elevate: "violet",
  "elevate-on-demand": "violet",
  "allow-monitor": "emerald",
  detect: "amber",
  "software-distributor": "slate",
  lcd: "blue",
  "remove-admin": "red",
  "add-to-group": "red",
  "endpoint-sign-in": "blue",
  "set-security": "slate",
  "run-script": "slate",
  "computer-action": "slate",
  exclude: "amber",
  eagles: "amber",
  restricted: "amber",
}

export const categoryTone = (categoryId: string): Tone =>
  CATEGORY_TONES[categoryId] ?? "neutral"

const SCOPE_TONES: Record<string, Tone> = {
  idp: "blue",
  azure: "violet",
  domain: "emerald",
  other: "slate",
}

export const scopeTone = (scopeId: string): Tone =>
  SCOPE_TONES[scopeId] ?? "slate"
