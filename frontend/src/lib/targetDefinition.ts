import type { TargetEntry } from "../types"

export const targetKindDisplayLabel = (target: TargetEntry): string => {
  if (target.accessType?.toLowerCase() === "sudo") return "Sudo command"
  switch (target.kind) {
    case "MacExecutable":
      return "Executable"
    case "MacDmg":
      return "DMG"
    case "MacPKG":
      return "PKG"
    case "MacScript":
      return "Script"
    case "Executable":
      return "Executable"
    case "Dll":
      return "DLL"
    case "MSI":
      return "MSI"
    case "MSU":
      return "MSU"
    case "Script":
      return "Script"
    case "COM":
      return "COM"
    case "AdminTask":
      return "Admin task"
    case "MacAdminTask":
      return "macOS admin task"
    case "ApplicationGroup":
      return "Application group"
    case "FSEntry":
      return "File system"
    case "RegKey":
      return "Registry key"
    case "Exclude":
      return "Exclude"
    case "MacExclude":
      return "macOS exclude"
    default:
      return target.kind
  }
}

export const targetDefinitionText = (target: TargetEntry): string => {
  if (target.definitionSummary && target.definitionSummary !== "—") {
    return target.definitionSummary
  }

  const parts: string[] = []
  if (target.publisher) parts.push(`Publisher is "${target.publisher}"`)
  if (target.bundleId) parts.push(`Bundle ID is "${target.bundleId}"`)
  if (target.accessType?.toLowerCase() === "sudo" && target.fileName) {
    parts.push(`Command is "${target.fileName}"`)
  } else {
    if (target.fileName) parts.push(`Filename is "${target.fileName}"`)
    if (target.location) parts.push(`Location is "${target.location}"`)
  }
  if (target.serviceName) parts.push(`Service name is "${target.serviceName}"`)
  if (target.name && (target.kind === "AdminTask" || target.kind === "MacAdminTask")) {
    parts.push(target.name)
  }

  return parts.length > 0 ? parts.join(" · ") : "—"
}

export const targetAccessFlags = (target: TargetEntry): string[] => {
  const flags: string[] = []
  if (target.accessType && target.accessType.toLowerCase() !== "sudo") {
    flags.push(target.accessType)
  }
  for (const [key, value] of Object.entries(target.attributes)) {
    if (value.toLowerCase() === "true" || value === "1") flags.push(key)
  }
  return flags
}
