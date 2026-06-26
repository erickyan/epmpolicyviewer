// Curated EPM agent paths that Set Security policies must not grant user access to.
// Extend this list when CyberArk guidance changes.
// Reference: https://docs.cyberark.com/epm/latest/en/content/policies/accessfilesystemregistry-newui.htm

export const PROTECTED_FILESYSTEM_PATHS: string[] = [
  "%ProgramFiles%\\CyberArk",
  "%ProgramFiles(x86)%\\CyberArk",
  "%ProgramData%\\CyberArk",
  "%ProgramData%\\Viewfinity",
  "C:\\Program Files\\CyberArk",
  "C:\\Program Files (x86)\\CyberArk",
  "C:\\ProgramData\\CyberArk",
  "C:\\ProgramData\\Viewfinity",
]

export const PROTECTED_REGISTRY_PATHS: string[] = [
  "HKLM\\Software\\CyberArk",
  "HKLM\\Software\\WOW6432Node\\CyberArk",
  "HKLM\\Software\\Viewfinity",
  "HKLM\\Software\\WOW6432Node\\Viewfinity",
  "HKEY_LOCAL_MACHINE\\Software\\CyberArk",
  "HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\CyberArk",
]
