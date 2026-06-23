export interface AppMeta {
  version: string
  lastUpdated: string
}

export interface AuthSession extends AppMeta {
  token: string
  expiresAt: string
  authenticatedAt: string
}

const STORAGE_KEY = "epm-viewer-auth-session"

export const loadAuthSession = (): AuthSession | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session.token || !session.expiresAt) return null
    if (Date.parse(session.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const saveAuthSession = (session: AuthSession): void => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const clearAuthSession = (): void => {
  sessionStorage.removeItem(STORAGE_KEY)
}

export const getAuthToken = (): string | undefined => loadAuthSession()?.token

export const formatBuildTimestamp = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
