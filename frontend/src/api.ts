import type { PolicyDocumentResponse } from "./types"

const parseError = async (response: Response): Promise<string> =>
  response
    .json()
    .then((data) => {
      const base = (data.error as string) ?? "Request failed"
      return data.detail ? `${base} (${data.detail as string})` : base
    })
    .catch(() => "Request failed")

export const uploadPolicyXml = async (
  file: File
): Promise<PolicyDocumentResponse> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/upload-xml", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as PolicyDocumentResponse
}

export const loadDefaultPolicy = async (): Promise<PolicyDocumentResponse> => {
  const response = await fetch("/api/default-policy")
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as PolicyDocumentResponse
}
