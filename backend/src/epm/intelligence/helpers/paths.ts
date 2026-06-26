const ENV_VAR_MAP: Record<string, string> = {
  "%programfiles%": "c:\\program files",
  "%programfiles(x86)%": "c:\\program files (x86)",
  "%programdata%": "c:\\programdata",
  "%windir%": "c:\\windows",
  "%systemroot%": "c:\\windows",
  "%systemdrive%": "c:",
}

export const normalizePathForMatch = (rawPath: string): string => {
  let path = rawPath.trim().replace(/\//g, "\\")
  if (!path) return ""

  for (const [token, value] of Object.entries(ENV_VAR_MAP)) {
    path = path.replace(new RegExp(token.replace(/[()]/g, "\\$&"), "gi"), value)
  }

  path = path.replace(/^\\\\\?\\/, "")
  path = path.replace(/\\+/g, "\\")
  if (path.length > 1 && path.endsWith("\\")) {
    path = path.slice(0, -1)
  }
  return path.toLowerCase()
}

export const pathMatchesProtectedEntry = (
  candidatePath: string,
  protectedEntry: string
): boolean => {
  const candidate = normalizePathForMatch(candidatePath)
  const protectedNorm = normalizePathForMatch(protectedEntry)
  if (!candidate || !protectedNorm) return false
  if (candidate === protectedNorm) return true
  return candidate.startsWith(`${protectedNorm}\\`)
}
