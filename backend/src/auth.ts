import crypto from "crypto"
import type { NextFunction, Request, Response } from "express"

const SESSION_TTL_MS = 8 * 60 * 60 * 1000

const sessions = new Map<string, { expiresAt: number }>()

export const AUTH_PASSPHRASE = process.env.AUTH_PASSPHRASE ?? "cyberarks"

const purgeExpiredSessions = (): void => {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token)
  }
}

export const createSession = (): { token: string; expiresAt: string } => {
  purgeExpiredSessions()
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAtMs = Date.now() + SESSION_TTL_MS
  sessions.set(token, { expiresAt: expiresAtMs })
  return { token, expiresAt: new Date(expiresAtMs).toISOString() }
}

export const isValidSession = (token: string | undefined): boolean => {
  if (!token) return false
  purgeExpiredSessions()
  const session = sessions.get(token)
  if (!session) return false
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

export const revokeSession = (token: string | undefined): void => {
  if (!token) return
  sessions.delete(token)
}

export const readBearerToken = (req: Request): string | undefined => {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return undefined
  return header.slice("Bearer ".length).trim() || undefined
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = readBearerToken(req)
  if (!isValidSession(token)) {
    res.status(401).json({ error: "Unauthorized", detail: "Session expired or invalid" })
    return
  }
  next()
}
