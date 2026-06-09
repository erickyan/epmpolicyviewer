# EPM Policies XML — Working Reference

Condensed from the official "EPM Policies XML format" spec (source last updated Apr 2020)
plus the bundled `default_policy.xml`. This is the quick-reference used by the
EPM Policy Viewer app; it intentionally focuses on what we parse/display.

---

## 1. Parsing constraints (CRITICAL)

- Parser: `fast-xml-parser`.
- Metadata (`id`, `name`, `action`, `order`, …) is stored as **XML attributes**, not child elements.
- Always instantiate with `{ ignoreAttributes: false, attributeNamePrefix: "@_" }`.
- Raise the entity DoS guard — real exports contain thousands of escaped entities
  (`&amp;`, `&lt;`, `&#xNN;`). Default cap is 1000; we use
  `processEntities: { maxTotalExpansions, maxExpandedLength, maxEntitySize, maxEntityCount }` set high.
- Encoding: exports are often **UTF-16 (LE/BE) or UTF-8 with a BOM**. Detect the BOM and decode
  accordingly before parsing (`buffer.toString("utf-8")` alone corrupts UTF-16).
- Always map raw `@_`-prefixed objects into clean interfaces before sending to the UI.

Value types: `Number` = 0–4294967295; `Boolean` = "False"/"0" → false, "True"/non-zero → true;
`GUID` = `{A57A2963-...}`. "Optional" attrs appear only when they differ from default.

---

## 2. Document structure

```
<Policies merge changeId version>
  <Policy action id name order serverPolicyId [internalType] [winMav] [macMav] [excludeType]>
    <Alert .../>            (action 10 only, plus other behavioral policies)
    <Configuration>...</Configuration>   (action 10 only)
    <Messages><Message id>...</Message></Messages>  (action 10 only)
    <Targets>
      <Executable|MacExecutable|Script|MSI|MSU|COM|AdminTask|MacAdminTask|URL|
       ActiveXInstall|FSEntry|RegKey|UsbDev|OpticalDisc|Exclude|MacExclude|
       LinuxExclude|Dll ...>
        <Publisher caseSensitive compareAs>...</Publisher>
        <Location caseSensitive>...</Location>
        ... (FileName, Arguments, Owner, BundleID, etc.)
      </...>
    </Targets>
  </Policy>
  ...
  <GUI>
    <Dialog id name type isDefault>  ...entity-escaped HTML...  </Dialog>
    <CommonCode id="VfCommonScript_...|VfWinCss_...|VfMacCss_...">  ...JS/CSS...  </CommonCode>
  </GUI>
</Policies>
```

- `<Policies>` attrs: `version` (XML format version), `changeId` (64-bit), `merge`.
- A single child collapses to an object (not array) in fast-xml-parser — always normalize to array.

---

## 3. EvfPolicyAction values (the `action` attribute)

| Value | Name | Description |
|---|---|---|
| 0 | Invalid | Reserved; never used in XML |
| 1 | Normal Run | Allow/force normal execution |
| 2 | Block | Block target app/task |
| 3 | Elevate | Change privileges via token rules |
| 4 | Elevate On Demand | Elevate after justification/password |
| 5 | Collect UAC Usage | Send UAC usage stats |
| 6 | Collect Policy Automation | Collect Policy Automation events (a.k.a. Zero Touch) |
| 7 | Log Off | Log off user |
| 8 | Computer Action | Shutdown/Restart/Hibernate |
| 9 | Run Script | Run embedded script |
| 10 | **Configuration** | Container for config params + common local GUI |
| 11 | Set Security | Modify FS/registry access |
| 12 | **Exclude** | Do not apply any policies to targets |
| 13 | Software Distributors | Definitions of software distributors |
| 14 | Restricted Run | Obsolete / not in use |
| 15 | **Eagles / Threat Protection** | Privilege threat protection (credential theft, etc.) |
| 16 | **Eagles Policy Global** | Global threat protection policy |
| 17 | LCD | Password rotation for Loosely Connected Devices |
| 18 | Multifile Creator | Definitions of multifile creators |
| 19 | **Exclude for macOS** | Do not apply policies to targets (mac) |
| 20 | Add To Local Group | Add users to local groups |
| 23 | Remove Local Admin Rights | Strip local admin; keeps an allow-list (see §12) |
| 24 | **Endpoint Sign-in** | OIDC desktop login (Windows/macOS) or Linux Identity Bridge |

### App category mapping (coarse buckets / tabs)
- **General Configuration** → action `10`
- **Excluded** → actions `12, 14, 19` (true exclusions — paths, macOS exclude, etc.)
- **Threat Protection** → actions `15, 16` (Eagles privilege threat protection — *not* exclusions)
- **Normal** → everything else (`1,2,3,4,5,6,7,8,9,11,13,18,20,23,…`)

`excludeType` attr (e.g. `newFiles`) refines exclude policies (e.g. "ignored locations for new apps").

### Finer category ("kind") shown as a badge + filter
Computed in `getPolicyCategory` (`labels.ts`). A policy is a **Default Policy** when
`implicit="true"`, or it has `internalDefaultPolicyModeAC`, or its name matches
`Main Default Policy` / `Default MAC Policy`. Otherwise it's labeled by action:
Block (2), Allow / Monitor (1), Elevate (3), Elevate on Demand (4), Detect / Automation (5/6),
Software Distributor (13), Multifile Creator (18), LCD (17), Remove Admin Rights (23),
Endpoint Sign-in (24), etc.

**Action 24 — Endpoint Sign-in** ([CyberArk docs](https://docs.cyberark.com/epm/latest/en/content/policies/endpointsigninpolicy.htm)).
The legacy PDF label was "IDP Policy for linux or user control for windows"; the product name is
**Endpoint sign-in**. One action covers two variants:
- **Windows / macOS (OIDC desktop login)**: `<OIDCConfig>` (Name, ConfigurationURL, ClientID,
  RedirectURI, UserDomain, Scopes) with `<Mappings>` (UserName, FirstName, LastName,
  AutoFillUserName) and `<FallbackOptions>` (allowTOTP, allowLocalLogin, RequireUserPin,
  FIDO2SecurityKey). Parsed into `PolicyEntry.endpointSignIn` and shown in the policy drilldown.
- **Linux Identity Bridge**: `<IDP AllowIdentityBridging …>` with `<AllowedDomainPatterns>`/
  `<Certificate>`, plus `<UserGroupList>` (IdpUser/IdpGroup). Variant detected; full Linux
  parsing TBD when a sample file is available.

Other real-world policy attrs seen: `implicit`, `internalDefaultPolicyModeAC`, `reportUsage`,
`sendPolicyAutomation`, `replaceUAC`/`replaceAdminUAC`, `suppressUAC`/`suppressAdminUAC`,
`collectUserReq`, `sourceUser`, `shellExtension`, `winMav`/`macMav`. `internalType=1003` is a
common custom (mac) policy type; `1280/1281` = elevate trusted-signature (main / installed-by);
`101/104/200/1001/3071/4101` = default/implicit policy types.

**Default classification**: a policy is treated as default/implicit (category "Default Policy",
hidden by the "Customized only" toggle) when `implicit="true"`, `internalDefaultPolicyModeAC` is
present, the name matches `Main Default Policy|Default MAC Policy|Default Policy`, **or** it is a
predefined trusted-distributor/updater *definition* (`action="13"` with `internalType` 800 / 805 /
820 — e.g. Jamf, Kandji, VMWare Workspace ONE, Intune). Custom definitions (810 / 830) stay
non-default.

**Audit setting (`reportUsage`)**: controls policy audit / usage reporting. `reportUsage="2"`
= audit **off** (these policies are typically named "… No Audit" / "… Without Audit"); the
attribute being absent = audit **on** (e.g. "Elevate - With Audit"). We surface this as
`PolicyEntry.auditEnabled` (`reportUsage !== "2"`) with an Audit / No-audit badge on every policy.

---

## 4. Target elements

Per-`<Targets>` child = one rule. Platform inferred from element name:
`Mac*` → macOS, `Linux*` → Linux, else Windows.

Common shape:
- Attributes: `targetId` (GUID), `softwareDistributorName` (action 13), `inheritable`,
  `ignoreFileOperations`, `ignoreProcessLaunches`, `token` (GUID → `/Policies/Tokens/Token`),
  `mav` (min agent version), `compareAs` (`exact|prefix|contains|wildcards|regexp`).
- Child elements: `<Publisher>` (digital signature; repeatable, OR-matched), `<Location>` (path),
  `<FileName>`, `<Arguments>`, `<Owner>`, `<BundleID>`, `<URL>`, `<FileVerInfo>`, `<Parent>`/`<ParentIsNot>` (process conditions), `<FileOrigin>`.
- `<Exclude>` / `<MacExclude>`: location-based (and publisher for mac) exclusions.
- `<FSEntry>` / `<RegKey>`: only under Set Security (action 11); `accessMask` hex, `allowAccess`.
- `<EmbeddedScript>`: `<ScriptName>`, `<ScriptContent>` (CDATA; base64 if `base64="True"`).
- `<Publisher>` repeats (OR-matched) — getText joins them. `<Type>` holds the access kind
  (`rights`, `sudo`). `<FileName>` is the app identifier on mac targets. "Installed by" targets
  nest the signer under `<FileOrigin><Package><Publisher>`.

**Inheritance (`inheritable` / `childProcs`)**: `inheritable="True"` means the rule also
applies to child processes spawned by the target (absent = not inherited); `childProcs` (e.g.
`"default"`) refines child-process handling. We expose these as `TargetEntry.inheritable` /
`TargetEntry.childProcs`, roll them up to `PolicyEntry.inheritableTargets`, and show an
inheritance badge + an "Inherit" column / settings strip on each policy.

**Service / version matching**: `<SvcName>` (Windows service) → `target.serviceName`;
repeatable `<FileVerInfo name="FileDescription|ProductName|…">value</FileVerInfo>` →
`target.fileVerInfo[]`. Both are common on Windows software-distributor targets.

**ApplicationGroup references**: a policy target `<ApplicationGroup id=… name=""/>` points at a
definition in the root `<ApplicationGroups>` block. We index those definitions and resolve each
reference's `name` and member applications onto `target.members[]`, shown as nested rows. The
definitions are also surfaced as `doc.applicationGroups[]` (id, name, inferred platform, members,
and a reverse `usedBy` list of referencing policies) and rendered in a dedicated **Application
Groups** tab. ApplicationGroup target rows (grouped + flat views) link into that viewer.
Each group also gets `isDefault`; the **Customized only** filter hides default groups, consistent
with how it hides implicit policies, default software-distributor definitions and default dialogs.

**Console default baseline**: `backend/data/default_app_group.json` and
`default_policy_console.json` are EPM console "default configuration" exports (JSON, despite the
source `.xml` extension) listing the out-of-the-box application groups (Allow / Block / Elevate /
Developer Applications) and policies (Allow / Block / Elevate). `extractConsoleDefaults` parses
them into name sets (`PolicyType 14` = application group), and `parsePolicyDocument` receives them
via `options.consoleDefaults`. An application group is `isDefault` when its name is in the console
baseline (or bracketed `[…]`, or referenced only by default/implicit policies). A policy is treated
as a default scaffold (implicit + "Default Policy" category) when its name matches a console default
policy name AND it targets a default application group (the name+target pair avoids flagging a
customer policy that merely shares a generic name like "Block").

**Admin tasks (`<AdminTask>` / `<MacAdminTask>`)**: predefined administrative tasks a standard
user can be elevated to run. Both carry only a numeric `id` (no name in the XML). **The id enums
are different on Windows vs macOS** — the same number means different things — so they are resolved
from two separate tables (`WIN_ADMIN_TASK_LABELS` / `MAC_ADMIN_TASK_LABELS` in
`backend/src/epm/labels.ts`). Source:
[CyberArk EPM "Application patterns" → Admin task ID](https://docs.cyberark.com/epm/latest/en/content/webservices/applicationpatterns.htm).
- `<AdminTask id="N">` → Windows admin tasks (1–59 plus 89/90/91, e.g. 6 = System Restore,
  16 = Windows Firewall, 42 = Services Configuration, 91 = Accessibility (Settings)).
- `<MacAdminTask id="N">` → macOS System Preferences (1–16 with gaps, e.g. 1 = Security and
  Privacy, 3 = Energy Saver, 8 = Date and Time, 10 = Time Machine). Ids outside the published
  range fall back to `macOS admin task #N`.
`getAdminTaskLabel(kind, id)` picks the right table by element kind and sets `target.name`.
The UI shows a friendly element label ("Admin Task" / "macOS Admin Task") with the resolved task
name underneath; the name is searchable.

We display: kind, platform, publisher, file/location (FileName or Location), service name,
file-version info, access type (`rights`/`sudo`), inheritance, ApplicationGroup members, targetId,
and remaining attrs as flags.

---

## 5. `<Configuration>` element (action 10)

Agent config (formerly conf.xml). Deeply nested. Major sections seen:
`Connection`, `PASProtection`, `Common`, `DataCollection` (+ `EventReportingMode`, `MaxHourlyEvents`,
`MacFullMeshScan`), `Telemetry`, `Policies` (engine: `PolicyUpdate`, `PolicyRecording`, sudo/mac/linux
settings), `EndUserNotifications`, `RemoteInstallation`, `Network`, `ChallengeResponse`,
`SuspendPolicies`, `ElevationAuthorizationGroup`, `AzureActiveDirectory`, `IdaptiveIntegration`,
`WebAuthentication`, `ESIConfigs`, `IdentityProvidersCache`.

Secrets use `...Ex3` element names with `exclude="true"` (e.g. `ProtPassEx3`, `ClientSecretEx3`).

`<Messages>` (action 10): `<Message id="...">text</Message>`. Known ids include
`VF_SF_FOLDER_NAME` (default "Viewfinity/CyberArk EPM Control Panel"),
`VF_SHELL_ELEVATE_MENU_TEXT` ("Run with Elevated Privileges"),
`VF_SHELL_CHALLENGERESPONSE_MENU_TEXT` ("Request Authorization").

The app shows curated groups (see `backend/src/epm/configGroups.ts`); full fidelity via Raw XML tab.

---

## 6. `<GUI>` element

- `<Dialog>` attrs: `id`, `name`, `type` (see §8), `isDefault`. **Text content = entity-escaped HTML.**
- The HTML references shared blocks by placeholder token (the CommonCode `id` placed literally inside
  `<style>`/`<script>`): `VfCommonScript_<GUID>` (JS), `VfWinCss_<GUID>` / `VfMacCss_<GUID>` (CSS).
- `<CommonCode id="...">` holds the actual JS/CSS. To render faithfully, **substitute each placeholder
  token with its CommonCode content**.
- OS detection: HTML referencing `VfWinCss` → Windows, `VfMacCss` → macOS.
- Dialog HTML calls an `external.*` host API (e.g. `external.JsOnRestartNow()`) only available inside the
  EPM agent → **render previews in a sandboxed iframe with scripts disabled** (safe + avoids errors).
- `<Balloon>` with `<Title>`/`<Text>` = tray balloon notifications (alternative to dialogs).

GUI variables usable in dialog HTML: `VF_COMPUTERNAME`, `VF_USER`, `VF_USER_DISPLAYNAME`,
`VF_AGENT_VERSION`, etc. (substituted at runtime by the agent).

---

## 7. `<Alert>` element

Attrs: `id` (links to a Dialog id), `trigger` (numeric, see §8), `type` (`Dialog`/`Balloon`),
`ostype` (e.g. `3` = mac). Defined under behavioral policies and action 10.

**Policy ↔ Dialog linkage:** `Alert.id === Dialog.id`. The app resolves each policy's Alerts to GUI
dialogs (`linkedDialogs`) and builds the reverse map (`Dialog.usedBy`). Confirmed in the real-world
export (e.g. a SCIM block policy's Alert id matches the "SCIM Application Block" dialog).

---

## 8. Alert triggers → dialog types (subset)

`type` on `<Dialog>` and the dialog shown per trigger:

| type | Dialog |
|---|---|
| 1 | Process Blocked notification |
| 2 | Alert on process start |
| 3 | Process Elevated notification |
| 4 | Elevate On Demand |
| 5 | Zero Touch |
| 6 | Manual Policy Request |
| 7 | Policy Video recording confirmation |
| 8 | Zero Touch (Non-Qualified) |
| 9 | About dialog |
| 10 | Policy Video low disk space |
| 11 | Log Off / Restart / Shutdown warning |
| 15 | Reboot after upgrade required |
| 16 | Kill apps dialog |
| 17 | Policy Video splash dialog |
| 18 | Apply policies dialog (GPO) |
| 20 | Propagate / Request Approval dialog (GPO) |
| 21 | Challenge / Response dialog |
| 28 | Run using authorization code |
| 36 | About dialog |
| 37 | Request for Authorization |
| 38 | Run using authorization code |

Triggers are `VF_TRIGGER_*` constants (e.g. `VF_TRIGGER_PROCESS_START`, `VF_TRIGGER_PROCESS_BLOCKED`,
`VF_TRIGGER_REBOOT_REQUIRED`, `VF_TRIGGER_CHALLENGE_RESPONSE`, `VF_TRIGGER_ABOUT`).

---

## 9. Policy `internalType` values (subset)

Identifies predefined/default policies. Falls back to raw value when unknown.

| internalType | Meaning |
|---|---|
| 101/103/104/105 | Default: grey apps / removable storage / downloaded-from-internet / removable monitor |
| 200/201/202/203 | Default: Windows system / old apps / temp files / Windows monitor |
| 210 | Trusted sample computer |
| 220/221 | Trusted network location (main/installed) |
| 230/231 | Trusted package (main/installed) |
| 242/243/244 | Trusted distributor (predefined/custom/installed) |
| 263/264/265 | Trusted updater (predefined/custom/installed) |
| 280/281 | Trusted vendor (main/installed) |
| 285 | Trusted product |
| 290/291 | Trusted user or group (main/installed) |
| 300/400 | Predefined / Custom app group |
| 500 | Advanced policy (EXPER) |
| 600 | Configuration |
| 700 | Exclude |
| 800/805/810 | Trusted distributor definitions |
| 820/830 | Trusted updater definitions |

---

## 10. `default_policy.xml` (bundled standard) summary

Root `version=5`, `changeId=198294364518110`, `merge=false`, 9 policies + `<GUI>`.

- **General Configuration** — action 10, "General configuration" (8 Alerts, Configuration, 3 Messages).
- **Normal (Software Distributors, action 13)** — Intune, VMware Workspace ONE, Jamf, Kandji
  (mac `MacExecutable` targets w/ Publisher + Location).
- **Excluded** — `[EXCLUDE PATHS POLICY MAC]` (19, 33 MacExclude targets),
  `[EXCLUDE FILES POLICY EAGLES]` (16, 0 targets), `[IGNORED LOCATIONS FOR NEW APPS POLICY]`
  (12 `excludeType=newFiles`, 33 Exclude targets), `[EXCLUDE FILES POLICY]` (12, 23 Exclude targets).
- **GUI** — 8 Dialogs (mac & windows variants of Request for Authorization, About, Run using
  authorization code, Request Approval, Restart Computer) + 3 CommonCode blocks (JS, Mac CSS, Win CSS).

---

## 12. Specific targeting — `<UserGroupList>`

A policy can apply only to specific users/groups. Direct child `<UserGroupList>` on the policy, or
nested under `<AllowedLocalAdministrators>` for Remove-Local-Admin-Rights (action 23, the allow-list).
Child element = the directory source; text = the principal:

- `<IdpGroup>` / `<IdpUser>` — SCIM / IdP group or user (e.g. `PG-CA-Gordon-Lee-EA`).
- `<User accountType="User|Group">` — AD user/group (e.g. `CORP\Domain Admins`).
- `<Group>`, `<AzUser>`, `<AzGroup>` — local / Azure AD principals.

The app collects these into `policy.userGroups` and shows an "Applies to specific users / groups"
panel (Scheduler/Condition exist in the schema but weren't present in the sample → not yet parsed).

**Scope (directory source)**: each principal is classified from its element name into a
`scopeId` / `scopeLabel` — `Idp*` → **IdP**, `Az*`/`Azure*`/`Aad*`/`Entra*` → **Azure AD**,
`User`/`Group`/`Domain*` → **Domain**, else **Other**. Distinct scopes are rolled up to
`policy.scopes` and surfaced as scope badges on each policy + a "Scope: …" line in the settings
strip (no `<UserGroupList>` ⇒ scope **All users**).

---

## 13. Overview summary & baseline comparison

`PolicyDocument.summary` powers the **Overview** tab:

- `totalPolicies / normalCount / excludedCount / defaultPolicyCount / guiCount` and
  `categoryCounts[]` (by finer `getPolicyCategory` id, see §_finer category_).
- **Customized general configuration** — each `ConfigItem` carries `path`, `defaultValue`,
  `customized`. The "default" baseline is the bundled `default_policy.xml` Configuration
  (action 10), extracted once via `extractConfigBaseline` and passed into `parsePolicyDocument`
  as `{ baseline }`. An item is `customized` only when the baseline has that path **and** the
  value differs. `summary.hasBaseline` is false when no baseline is available (then nothing is flagged).
- **Duplicate policies** (`summary.duplicateGroups`) — best-effort: groups of ≥2 policies that
  share the same `action` + identical target signature, or an identical name. The target
  signature includes kind/platform/publisher/location/fileName/accessType **plus** `name` and
  `refId` so `<ApplicationGroup id=… name=…>` references don't collapse into false matches.
  Default/implicit baseline policies and "Installed by:" companions (internalType
  221/231/244/265/281/291/1281, or a name starting with "Installed by:") are excluded, since
  their parallel structures are by design rather than admin-introduced duplicates.

`<ApplicationGroup>` targets: `platform` = `Any`, `name` ← `@_name`, `refId` ← `@_id`
(both reserved out of the generic attribute flags).

---

## 11. App architecture cross-reference

- `backend/src/epm/labels.ts` — action / internalType / dialog-type maps + category sets.
- `backend/src/epm/configGroups.ts` — curated Configuration field spec.
- `backend/src/epm/parsePolicyDocument.ts` — produces the structured `PolicyDocument`.
- `backend/src/decodeXml.ts` — BOM/UTF-16 decoding.
- Endpoints: `GET /api/default-policy` (bundled `backend/data/default_policy.xml`),
  `POST /api/upload-xml`. Both return `{ document, source, fileName }`.
