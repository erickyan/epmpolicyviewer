// Broad OS folders that Set Security policies must not grant user access to.
// Separate from CyberArk agent paths in protectedPaths.ts.
// Reference: https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm

export const PROTECTED_OS_FOLDER_PATHS: string[] = [
  "%windir%",
  "%systemroot%",
  "C:\\Windows",
  "%ProgramFiles%",
  "%ProgramFiles(x86)%",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\",
  "%SystemDrive%\\",
]

export const PROTECTED_OS_REGISTRY_PATHS: string[] = [
  "HKLM\\Software\\Microsoft\\Windows",
  "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows",
  "HKLM\\System",
  "HKEY_LOCAL_MACHINE\\System",
]
