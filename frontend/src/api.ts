import type { PolicyDocumentResponse } from "./types"
import {
  clearAuthSession,
  getAuthToken,
  type AppMeta,
  type AuthSession,
} from "./lib/auth"

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const parseError = async (response: Response): Promise<string> =>
  response
    .json()
    .then((data) => {
      const base = (data.error as string) ?? "Request failed"
      return data.detail ? `${base} (${data.detail as string})` : base
    })
    .catch(() => "Request failed")

const authHeaders = (): HeadersInit => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const request = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })

  if (response.status === 401) {
    clearAuthSession()
    throw new ApiError("Your session has expired. Sign in again.", 401)
  }

  return response
}

export const fetchAppMeta = async (): Promise<AppMeta> => {
  const response = await fetch("/api/meta")
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as AppMeta
}

export const loginWithPassphrase = async (passphrase: string): Promise<AuthSession> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as AuthSession
}

export const logoutSession = async (): Promise<void> => {
  const response = await request("/api/auth/logout", { method: "POST" })
  if (!response.ok) throw new Error(await parseError(response))
  clearAuthSession()
}

export const uploadPolicyXml = async (
  file: File
): Promise<PolicyDocumentResponse> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await request("/api/upload-xml", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as PolicyDocumentResponse
}

export const loadDefaultPolicy = async (): Promise<PolicyDocumentResponse> => {
  const response = await request("/api/default-policy")
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as PolicyDocumentResponse
}

export const fetchRawXml = async (
  source: PolicyDocumentResponse["source"]
): Promise<string> => {
  const response = await request(`/api/raw-xml?source=${source}`)
  if (!response.ok) throw new Error(await parseError(response))
  const data = (await response.json()) as { xml: string }
  return data.xml
}

export { ApiError }
