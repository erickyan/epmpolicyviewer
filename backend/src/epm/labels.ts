// Authoritative reference data from "EPM Policies XML format" spec.

// EvfPolicyAction values
export const ACTION_LABELS: Record<string, string> = {
  "0": "Invalid",
  "1": "Normal Run",
  "2": "Block",
  "3": "Elevate",
  "4": "Elevate On Demand",
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
export const EXCLUDE_ACTIONS = new Set(["12", "14", "15", "16", "19"])

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
      return { id: "eagles", label: "Eagles (Ignored Locations)" }
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

// Windows admin task ids (EvfAdminTaskId) — the predefined administrative tasks a
// standard user can be allowed/elevated to run, used by <AdminTask id="…">.
export const ADMIN_TASK_LABELS: Record<string, string> = {
  "1": "Accessibility, Keyboard, Mouse etc",
  "2": "Display, Colors, Fonts, Visual Effects",
  "3": "Region and Language",
  "4": "Date and Time",
  "5": "Windows Backup and Restore",
  "6": "System Restore",
  "7": "Create a System Repair Disk",
  "8": "Programs and Features",
  "9": "Automatic Updates configuration",
  "10": "Disk Defragmenter",
  "11": "Search Indexing",
  "12": "Disk Management",
  "13": "Power Options",
  "14": "System Properties",
  "15": "Internet Options",
  "16": "Windows Firewall",
  "17": "Hardware",
  "18": ".NET Configuration (mscorcfg.msc)",
  "19": "Application Server (appsrv.msc)",
  "20": "Authorization Manager (azman.msc)",
  "21": "Certificate Services (certsrv.msc)",
  "22": "Certificate Templates (certtmpl.msc)",
  "23": "Certificates snap-in (certmgr.msc)",
  "24": "Device Manager (devmgmt.msc)",
  "25": "DHCP Manager (dhcpmgmt.msc)",
  "26": "Disk Defragmenter (dfrg.msc)",
  "27": "Disk Management (diskmgmt.msc)",
  "28": "Distributed File System (dfsgui.msc)",
  "29": "DNS Manager (dnsmgmt.msc)",
  "30": "Event Viewer (eventvwr.msc)",
  "31": "Fax Service Manager (fxsadmin.msc)",
  "32": "File Server Management (filesvr.msc)",
  "33": "Indexing Service (ciadv.msc)",
  "34": "Internet Authentication Service (ias.msc)",
  "35": "Internet Information Services (iis.msc)",
  "36": "Performance Monitor (perfmon.msc)",
  "37": "Remote Desktop (tsmmc.msc)",
  "38": "Removable Storage Manager (ntmsmgr.msc)",
  "39": "Removable Storage Operator Requests (ntmsoprq.msc)",
  "40": "Resultant Set of Policy (rsop.msc)",
  "41": "Routing and Remote Access (rrasmgmt.msc)",
  "42": "Services Configuration (services.msc)",
  "43": "Shared Folders (fsmgmt.msc)",
  "44": "SQL Server Configuration Manager",
  "45": "Telephony (tapimgmt.msc)",
  "46": "Terminal Services (tscc.msc)",
  "47": "Update Services (wsus.msc)",
  "48": "Windows Firewall (wf.msc)",
  "49": "Windows Internet Naming Service / WINS (winsmgmt.msc)",
  "50": "Windows Management Instrumentation (wmimgmt.msc)",
  "51": "Hyper-V Manager (virtmgmt.msc)",
  "52": "Add/Remove Printers",
  "53": "Network Configuration",
  "54": "Group Policy Editor (gpedit.msc)",
  "55": "Local Users and Groups (lusrmgr.msc)",
  "56": "Java Update",
  "57": "Internet Information Services (IIS) Management",
  "58": "Optional Features tab in ICP",
  "59": "Microphone tab in ICP",
}

// Resolve a human-readable name for an <AdminTask>/<MacAdminTask> target by id.
// EPM does not publish the numeric EvfMacAdminTaskId mapping, so mac tasks are
// surfaced generically as a macOS System Preference task.
export const getAdminTaskLabel = (
  kind: string,
  id?: string
): string | undefined => {
  if (id === undefined || id === "") return undefined
  if (kind === "MacAdminTask") return `macOS System Preference Task #${id}`
  return ADMIN_TASK_LABELS[id] ?? `Admin task #${id}`
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
