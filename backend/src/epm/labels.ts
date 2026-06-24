// Authoritative reference data from "EPM Policies XML format" spec.

// EvfPolicyAction values
export const ACTION_LABELS: Record<string, string> = {
  "0": "Invalid",
  "1": "Normal Run",
  "2": "Block",
  "3": "Elevate",
  "4": "Elevate on Demand",
  "5": "Collect UAC Usage",
  "6": "Collect Policy Automation",
  "7": "Log Off",
  "8": "Computer Action",
  "9": "Run Script",
  "10": "Configuration",
  "11": "Set Security",
  "12": "Exclude",
  "13": "Software Distributors",
  "14": "Restricted Run",
  "15": "Eagles Policy",
  "16": "Eagles Policy Global",
  "17": "LCD",
  "18": "Multifile Creator",
  "19": "Exclude for macOS",
  "20": "Add To Local Group",
  "23": "Remove Local Admin Rights",
  "24": "Endpoint Sign-in",
}

// Actions that represent the General Configuration container.
export const CONFIGURATION_ACTIONS = new Set(["10"])

// Actions that represent exclusion-type policies.
export const EXCLUDE_ACTIONS = new Set(["12", "14", "19"])

// Privilege Threat Protection (Eagles) policies — action 15/16 in the XML spec.
export const THREAT_PROTECTION_ACTIONS = new Set(["15", "16"])

export const getActionLabel = (action: string): string =>
  ACTION_LABELS[action] ?? `Action ${action}`

export interface PolicyCategoryInfo {
  id: string
  label: string
}

interface PolicyCategoryInput {
  action: string
  implicit?: string
  internalDefaultPolicyModeAC?: string
  excludeType?: string
  name?: string
  internalType?: string
}

// Predefined trusted distributor / updater *definitions* (action 13) shipped as
// part of the CyberArk baseline (e.g. Jamf / Kandji / VMWare / Intune). Custom
// definitions (810 / 830) are intentionally excluded.
const PREDEFINED_DISTRIBUTOR_TYPES = new Set(["800", "805", "820"])

// Default (implicit) policies are the baseline policies CyberArk ships/maintains.
// They are marked implicit="true", carry internalDefaultPolicyModeAC, use the
// "Main Default Policy" / "Default MAC Policy" naming convention, or are predefined
// trusted-distributor definitions.
export const isDefaultPolicy = (p: PolicyCategoryInput): boolean => {
  if ((p.implicit ?? "").toLowerCase() === "true") return true
  if (p.internalDefaultPolicyModeAC !== undefined) return true
  if (p.action === "13" && PREDEFINED_DISTRIBUTOR_TYPES.has(p.internalType ?? ""))
    return true
  const name = p.name ?? ""
  return /Main Default Policy|Default MAC Policy|Default Policy/i.test(name)
}

// A finer-grained, user-facing category ("kind") for a policy beyond the coarse
// normal/excluded bucket. Drives the Category column + filter in the UI.
export const getPolicyCategory = (p: PolicyCategoryInput): PolicyCategoryInfo => {
  if (isDefaultPolicy(p)) return { id: "default", label: "Default Policy" }

  switch (p.action) {
    case "1":
      return { id: "allow-monitor", label: "Allow / Monitor" }
    case "2":
      return { id: "block", label: "Block" }
    case "3":
      return { id: "elevate", label: "Elevate" }
    case "4":
      return { id: "elevate-on-demand", label: "Elevate on Demand" }
    case "5":
    case "6":
      return { id: "detect", label: "Detect / Automation" }
    case "9":
      return { id: "run-script", label: "Run Script" }
    case "8":
      return { id: "computer-action", label: "Computer Action" }
    case "11":
      return { id: "set-security", label: "Set Security" }
    case "13":
      return { id: "software-distributor", label: "Software Distributor" }
    case "17":
      return { id: "lcd", label: "LCD" }
    case "20":
      return { id: "add-to-group", label: "Add to Local Group" }
    case "23":
      return { id: "remove-admin", label: "Remove Admin Rights" }
    case "24":
      return { id: "endpoint-sign-in", label: "Endpoint Sign-in" }
    case "12":
    case "19":
      return { id: "exclude", label: "Exclusion" }
    case "16":
    case "15":
      return { id: "threat-protection", label: "Threat Protection" }
    case "14":
      return { id: "restricted", label: "Restricted" }
    default:
      return { id: `action-${p.action}`, label: getActionLabel(p.action) }
  }
}

// Policy internalType attribute values (subset from spec; falls back to raw).
export const INTERNAL_TYPE_LABELS: Record<string, string> = {
  "0": "Unknown",
  "101": "Default: Grey apps on end-user computers",
  "1001": "Default: macOS privilege management",
  "1003": "Custom policy (macOS)",
  "1280": "Elevate trusted signature (main)",
  "1281": "Elevate trusted signature (installed)",
  "4101": "Default: Linux privilege management",
  "103": "Default: Removable storages",
  "104": "Default: Downloaded from internet",
  "105": "Default: Removable monitor",
  "200": "Default: Windows system",
  "201": "Default: Old applications",
  "202": "Default: Temp files",
  "203": "Default: Windows monitor",
  "210": "Trusted sample computer",
  "220": "Trusted network location (main)",
  "221": "Trusted network location (installed)",
  "230": "Trusted package (main)",
  "231": "Trusted package (installed)",
  "242": "Trusted distributor (predefined)",
  "243": "Trusted distributor (custom)",
  "244": "Trusted distributor (installed)",
  "263": "Trusted updater (predefined)",
  "264": "Trusted updater (custom)",
  "265": "Trusted updater (installed)",
  "280": "Trusted vendor (main)",
  "281": "Trusted vendor (installed)",
  "285": "Trusted product",
  "290": "Trusted user or group (main)",
  "291": "Trusted user or group (installed)",
  "300": "Predefined app group",
  "400": "Custom app group",
  "500": "Advanced policy",
  "600": "Configuration",
  "700": "Exclude",
  "800": "Trusted distributor (predefined definition)",
  "805": "Trusted distributor definition",
  "810": "Trusted distributor (custom definition)",
  "820": "Trusted updater (predefined definition)",
  "830": "Trusted updater (custom definition)",
}

export const getInternalTypeLabel = (internalType?: string): string | undefined => {
  if (!internalType) return undefined
  return INTERNAL_TYPE_LABELS[internalType] ?? `Type ${internalType}`
}

// Admin task ids — the predefined administrative tasks a standard user can be
// allowed/elevated to run. CRITICAL: the same numeric id means DIFFERENT things on
// Windows (<AdminTask>) vs macOS (<MacAdminTask>); they are separate enums.
// Source: CyberArk EPM "Application patterns" → Admin task ID.
// https://docs.cyberark.com/epm/latest/en/content/webservices/applicationpatterns.htm

// Windows admin task ids (<AdminTask id="…">).
// EvfAdminTaskId enum 1–59 (sequential) — validated against the PDF spec, installed
// EPM agent VFAT_* enum order, and CyberArk application patterns web doc.
// Settings app tasks 89–91 are documented separately (not in the legacy PDF enum).
export const WIN_ADMIN_TASK_LABELS: Record<string, string> = {
  "1": "Accessibility (Control Panel)",
  "2": "Display, Colors, Fonts, Visual Effects (Control Panel)",
  "3": "Regional and Language Options (Control Panel)",
  "4": "Date and Time (Control Panel, Settings)",
  "5": "Backup (Control Panel)",
  "6": "System Restore",
  "7": "Create a System Repair Disk",
  "8": "Add/Remove Programs and Windows Features",
  "9": "Automatic Updates Configuration",
  "10": "Disk Defragmenter",
  "11": "Windows Search Indexing Options",
  "12": "Disk Management",
  "13": "Power Options",
  "14": "System Properties",
  "15": "Internet Options",
  "16": "Windows Firewall",
  "17": "Hardware (Control Panel)",
  "18": ".NET Configuration",
  "19": "Application Server",
  "20": "Authorization Manager",
  "21": "Certificate Services",
  "22": "Certificate Templates",
  "23": "Certificate snap-in",
  "24": "Device Manager",
  "25": "DHCP Manager",
  "26": "Disk Defragmenter",
  "27": "Disk Management",
  "28": "Distributed File System",
  "29": "DNS Manager",
  "30": "Event Viewer",
  "31": "Fax Service Manager",
  "32": "File Server Management",
  "33": "Indexing Service",
  "34": "Internet Authentication Service",
  "35": "Internet Information Services",
  "36": "Performance Monitor",
  "37": "Remote Desktop",
  "38": "Removable Storage Manager",
  "39": "Removable Storage Operator Requests",
  "40": "Resultant Set of Policy",
  "41": "Routing and Remote Access",
  "42": "Services Configuration",
  "43": "Shared Folders",
  "44": "SQL Server Configuration Manager",
  "45": "Telephony",
  "46": "Terminal Services",
  "47": "Update Services",
  "48": "Windows Firewall",
  "49": "Windows Internet Naming Service (WINS)",
  "50": "Windows Management Instrumentation",
  "51": "Hyper-V Manager",
  "52": "Add/Remove Printers",
  "53": "Network Properties",
  "54": "Group Policy Editor",
  "55": "Local Users and Groups",
  "56": "Java Update",
  "57": "Internet Information Services (IIS) Management",
  "58": "Optional Features (Settings)",
  "59": "Microphone",
  "89": "Access work or school (Settings)",
  "90": "Create a Dev Drive (Settings)",
  "91": "Accessibility (Settings)",
}

// macOS admin task ids (<MacAdminTask id="…">) — macOS System Preferences.
// Source: CyberArk EPM application patterns + EvfMacAdminTaskId enum order
// (VfAgentDeclarations.cs / installed EPM agent).
export const MAC_ADMIN_TASK_LABELS: Record<string, string> = {
  "1": "Security and Privacy",
  "2": "CDs and DVDs",
  "3": "Energy Saver",
  "4": "Printers and Scanning",
  "5": "Network and WiFi",
  "6": "Users and Groups",
  "7": "Parental Controls",
  "8": "Date and Time",
  "9": "Startup Disk",
  "10": "Time Machine",
  "11": "App Store",
  "12": "Sharing",
  "13": "Finder",
  "14": "Install Software",
  "15": "Copy/delete to/from Applications system folder",
  "16": "Battery",
  "17": "Lock Screen",
}

// Resolve a human-readable name for an <AdminTask>/<MacAdminTask> target by id,
// using the platform-specific enum.
export const getAdminTaskLabel = (
  kind: string,
  id?: string
): string | undefined => {
  if (id === undefined || id === "") return undefined
  if (kind === "MacAdminTask")
    return MAC_ADMIN_TASK_LABELS[id] ?? `macOS admin task #${id}`
  return WIN_ADMIN_TASK_LABELS[id] ?? `Windows admin task #${id}`
}

// Dialog "type" attribute -> human-readable name (from Alert triggers and dialog
// types table). Falls back to the dialog's own name attribute when unknown.
export const DIALOG_TYPE_LABELS: Record<string, string> = {
  "1": "Process Blocked notification",
  "2": "Alert on process start",
  "3": "Process Elevated notification",
  "4": "Elevate On Demand",
  "5": "Zero Touch",
  "6": "Manual Policy Request",
  "7": "Policy Video recording confirmation",
  "8": "Zero Touch (Non-Qualified)",
  "9": "About dialog",
  "10": "Policy Video low disk space",
  "11": "Log Off / Restart / Shutdown warning",
  "15": "Reboot after upgrade required",
  "16": "Kill apps dialog",
  "17": "Policy Video splash dialog",
  "18": "Apply policies dialog",
  "20": "Propagate / Request Approval dialog",
  "21": "Challenge / Response dialog",
  "25": "Application blocked",
  "26": "Application launch alert",
  "27": "Sudo confirmation",
  "28": "Run using authorization code",
  "30": "Admin privileges required",
  "36": "About dialog",
  "37": "Request for Authorization",
  "38": "Run using authorization code",
}

export const getDialogTypeLabel = (type?: string): string | undefined => {
  if (!type) return undefined
  return DIALOG_TYPE_LABELS[type] ?? `Dialog type ${type}`
}
