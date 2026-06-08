// Curated, friendly-labeled view of the <Configuration> tree. Paths are relative
// to the Configuration element. Unknown/missing paths are silently skipped, so
// this stays robust across EPM versions. The Raw XML tab preserves full fidelity.

export interface ConfigFieldSpec {
  path: string
  label: string
}

export interface ConfigGroupSpec {
  title: string
  fields: ConfigFieldSpec[]
}

export const CONFIG_GROUP_SPECS: ConfigGroupSpec[] = [
  {
    title: "Server Connection",
    fields: [
      { path: "Connection.IgnoreIncorrectCertificates", label: "Ignore incorrect certificates" },
      { path: "Connection.DisconnectTimeout", label: "Disconnect timeout (s)" },
      { path: "Connection.SOAPTimeout", label: "SOAP timeout (s)" },
      { path: "Connection.AccessTokenRefreshTime", label: "Access token refresh (s)" },
      { path: "Connection.UseNativeWinHttp4TLS12", label: "Use native WinHTTP for TLS 1.2" },
    ],
  },
  {
    title: "Agent Behavior",
    fields: [
      { path: "Common.BootStartDriver", label: "Boot-start driver" },
      { path: "Common.CollectAgentTrace", label: "Collect agent trace" },
      { path: "Common.NetworkShareSupport", label: "Network share support" },
      { path: "Common.CmdClientValidation", label: "Command client validation" },
      { path: "Common.ProtectUserGroups", label: "Protect user groups" },
      { path: "Common.AllowKernelUpgrade", label: "Allow kernel upgrade" },
      { path: "Common.UseIPCSecureBus", label: "Use IPC secure bus" },
      { path: "Common.ProtPassEnable", label: "Protection password enabled" },
    ],
  },
  {
    title: "Policy Engine",
    fields: [
      { path: "Policies.DiscoverSourceURL", label: "Discover source URL" },
      { path: "Policies.MonitorSystemProcess", label: "Monitor system process" },
      { path: "Policies.ScriptsDigitalSignature", label: "Require script signatures" },
      { path: "Policies.BlockDetoursLoading", label: "Block detours loading" },
      { path: "Policies.ImageFileValidation", label: "Image file validation" },
      { path: "Policies.HeartBeatTimeout", label: "Heartbeat timeout (s)" },
      { path: "Policies.ScriptTimeout", label: "Script timeout (s)" },
      { path: "Policies.PoliciesTargetMatchingMethod", label: "Target matching method" },
      { path: "Policies.VerifyPublisherTrustOverNetwork", label: "Verify publisher over network" },
    ],
  },
  {
    title: "Policy Updates",
    fields: [
      { path: "Policies.PolicyUpdate.Rate", label: "Update rate" },
      { path: "Policies.PolicyUpdate.Time", label: "Update interval (s)" },
      { path: "Policies.PolicyUpdate.RandomDelay", label: "Random delay (s)" },
    ],
  },
  {
    title: "Data Collection",
    fields: [
      { path: "DataCollection.SendPolicyUsage", label: "Send policy usage" },
      { path: "DataCollection.RushMode", label: "Rush mode" },
      { path: "DataCollection.ReportWindowsFiles", label: "Report Windows files" },
      { path: "DataCollection.KeepPolicyUsageForDays", label: "Keep policy usage (days)" },
      { path: "DataCollection.MaxEventsSizeInMemory", label: "Max events in memory (bytes)" },
      { path: "DataCollection.MaxEventsSizeOnDisk", label: "Max events on disk (bytes)" },
      { path: "DataCollection.FileExts", label: "Monitored file extensions" },
      { path: "DataCollection.IncludeDlls", label: "Include DLLs" },
      { path: "DataCollection.MaxLogSizeMb", label: "Max log size (MB)" },
      { path: "DataCollection.SystemUserEvents", label: "System user events" },
    ],
  },
  {
    title: "Privileged Account Security",
    fields: [
      { path: "PASProtection.FlushIntervalSec", label: "Flush interval (s)" },
      { path: "PASProtection.MaxBytesPerHour", label: "Max bytes / hour" },
      { path: "PASProtection.AggregationInterval", label: "Aggregation interval (s)" },
      { path: "PASProtection.CollectProtectedAccounts", label: "Collect protected accounts" },
      { path: "PASProtection.AntiCodeInjection", label: "Anti code injection" },
    ],
  },
  {
    title: "Policy Recording (Video)",
    fields: [
      { path: "Policies.PolicyRecording.KeepMoviesTimeoutInDays", label: "Keep recordings (days)" },
      { path: "Policies.PolicyRecording.MinFreeDiskSpaceInMb", label: "Min free disk (MB)" },
      { path: "Policies.PolicyRecording.MaxUsedDiskSpaceInMb", label: "Max used disk (MB)" },
      { path: "Policies.PolicyRecording.MaximumMovieLengthInMinutes", label: "Max recording length (min)" },
      { path: "Policies.PolicyRecording.AllowProgramRunIfNoRecording", label: "Run if no recording" },
    ],
  },
  {
    title: "End-User Notifications",
    fields: [
      { path: "EndUserNotifications.ShowBalloonTips", label: "Show balloon tips" },
      { path: "EndUserNotifications.ShowTrayIcon", label: "Show tray icon" },
      { path: "EndUserNotifications.HideRunAsVerb", label: "Hide 'Run as' verb" },
      { path: "EndUserNotifications.HideARPEntry", label: "Hide Add/Remove entry" },
      { path: "EndUserNotifications.ShowFilePropPage", label: "Show file property page" },
      { path: "EndUserNotifications.ShowBalloonOnPolicyUpdate", label: "Balloon on policy update" },
    ],
  },
  {
    title: "macOS & Linux",
    fields: [
      { path: "Policies.MacOSAllowRootDelegationForRootPrograms", label: "macOS root delegation" },
      { path: "Policies.MacOSProhibitSudoersFileModification", label: "Prohibit sudoers modification" },
      { path: "Policies.ValidateOTP", label: "Validate OTP" },
      { path: "Policies.EnableSudoListing", label: "Enable sudo listing" },
      { path: "Policies.AllowedInterpreters", label: "Allowed interpreters" },
    ],
  },
  {
    title: "Challenge / Response",
    fields: [
      { path: "ChallengeResponse.EnableChallengeResponse", label: "Enable challenge/response" },
      { path: "ChallengeResponse.EnableRunWithAuthorizationToken", label: "Run with auth token" },
      { path: "ChallengeResponse.NumberOfAttempts", label: "Number of attempts" },
    ],
  },
  {
    title: "Azure Active Directory",
    fields: [
      { path: "AzureActiveDirectory.EnableAzureAD", label: "Enable Azure AD" },
      { path: "AzureActiveDirectory.TenantID", label: "Tenant ID" },
      { path: "AzureActiveDirectory.AzureType", label: "Azure type" },
      { path: "AzureActiveDirectory.FullCacheRefreshIntervalInHours", label: "Cache refresh (h)" },
    ],
  },
  {
    title: "Web Authentication",
    fields: [
      { path: "WebAuthentication.Active", label: "Active" },
      { path: "WebAuthentication.Name", label: "Name" },
      { path: "WebAuthentication.RedirectURI", label: "Redirect URI" },
    ],
  },
  {
    title: "Network",
    fields: [
      { path: "Network.DownloadTimeout", label: "Download timeout (ms)" },
      { path: "Network.PingTimeout", label: "Ping timeout (ms)" },
      { path: "RemoteInstallation.DiscoveryCancelTimeout", label: "Discovery cancel (ms)" },
      { path: "RemoteInstallation.InstallationCancelTimeout", label: "Install cancel (ms)" },
    ],
  },
  {
    title: "Telemetry",
    fields: [
      { path: "Telemetry.SendTimeIntervalSeconds", label: "Send interval (s)" },
      { path: "Telemetry.MaxPayloadSizeBytes", label: "Max payload (bytes)" },
    ],
  },
]
