# Policy Intelligence Rules

Curated rules run at parse time on the backend. Findings are attached to `PolicyDocument.intelligence` and to each affected `PolicyEntry.findings`. The UI renders results only — no rule logic on the frontend.

CyberArk public documentation is **curated manually** in rule modules and data files. Nothing is scraped at runtime.

## Adding a rule

1. Create `backend/src/epm/intelligence/rules/myNewRule.ts` and export a `PolicyRule`:

```typescript
import type { PolicyRule } from "../types"
import { makeFinding } from "../types"

export const myNewRule: PolicyRule = {
  id: "my-new-rule",
  title: "Short title for UI",
  description: "What this rule checks and why it matters.",
  severity: "warning", // critical | warning | info
  docUrl: "https://docs.cyberark.com/...",
  evaluate: (ctx) => {
    const findings = []
    for (const policy of ctx.allPolicies) {
      // ...
      findings.push(makeFinding(myNewRule, policy, "Message for this policy.", {
        evidence: { key: "value" },
        remediation: "Suggested fix.",
      }))
    }
    return findings
  },
}
```

2. Register it in `backend/src/epm/intelligence/rules/index.ts`:

```typescript
import { myNewRule } from "./myNewRule"

export const POLICY_RULES: PolicyRule[] = [
  // ...existing rules
  myNewRule,
]
```

3. Mirror any new types in `frontend/src/types.ts` if needed (usually not for new rules).

4. Update this document with a row in the table below.

No changes to `engine.ts` or the Intelligence tab shell are required unless you introduce new evidence shapes the UI should format specially.

## Context available to rules

`RuleContext` provides:

- `normalPolicies`, `excludedPolicies`, `threatProtectionPolicies`
- `allPolicies` — union of the three lists
- `applicationGroups` — for flattening app-group members

Helpers live under `backend/src/epm/intelligence/helpers/`:

| Helper | Purpose |
|--------|---------|
| `collectAllTargets(policy, appGroups)` | Flatten direct targets + expanded app-group members |
| `targetPublisherValue`, `targetIsPublisherOnly`, `isBroadOsPublisher` | Publisher-based checks |
| `targetHasChecksumOnly`, `targetHasChecksumHash` | Checksum/hash-only application matching |
| `targetHasLocationOnlyMatch`, `isBroadLocationPath` | Broad folder-only location checks |
| `hasStandardPolicyName` | CyberArk naming convention heuristic |
| `findShellInheritableTargets`, `targetMatchesShellParent` | Shell parent + inheritance (explorer, cmd, PowerShell, wt) |
| `normalizePathForMatch`, `pathMatchesProtectedEntry` | Filesystem/registry path matching |

Protected paths are maintained in:

- `backend/src/epm/intelligence/data/protectedPaths.ts` — CyberArk agent install/data paths
- `backend/src/epm/intelligence/data/osProtectedPaths.ts` — broad OS folders (Windows, Program Files)

## v1 rules

| Rule ID | Severity | Doc | Detection summary |
|---------|----------|-----|-------------------|
| `definition-limit` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Policy `definitionCount` exceeds 1,000 (app-group members included in count). |
| `broad-publisher-audit` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Audit enabled; every publisher-bearing target is publisher-only and uses macOS **Software Signing** or Windows **Microsoft Windows**. Skips implicit policies. |
| `publisher-only-audit` | warning | [Security best practices](https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm) | Audit enabled; publisher-only targets that are **not** broad OS signatures. Complements `broad-publisher-audit`. |
| `protected-agent-path` | critical | [Access FS/registry](https://docs.cyberark.com/epm/latest/en/content/policies/accessfilesystemregistry-newui.htm) | Set Security (`action` 11) with `allowAccess` on an `FSEntry` or `RegKey` matching curated CyberArk agent paths. |
| `protected-os-folder` | critical | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Set Security (`action` 11) with `allowAccess` on broad OS folders (`C:\Windows`, Program Files, etc.). |
| `explorer-inheritable-child-procs` | critical | [Explorer.exe with child processes](https://community.cyberark.com/s/article/EPM-Policies-for-Explorer-exe-with-child-processes) | Windows shell parent (`explorer.exe`, `cmd.exe`, `powershell.exe`, `pwsh.exe`, `wt.exe`) with `inheritable="True"`. |
| `checksum-only-match` | warning | [Security best practices](https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm) | Application matched by `FileName` hash only — no publisher or path. |
| `block-checksum-only` | info | [Security best practices](https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm) | Block policy (`action` 2) using checksum-only matching. |
| `broad-location-only` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Broad folder location without filename or publisher (e.g. `%windir%`, `C:\`). |
| `implicit-default-modified` | warning | [Security best practices](https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm) | Implicit/default policy with user-group targeting or customized definitions vs baseline. |
| `duplicate-policies` | info | — | Identical action + target signature + user targeting, or duplicate policy names. |
| `missing-policy-description` | info | [Policy guidelines](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm) | Custom policy with no `desc`/`description` attribute or `<Description>` element. |
| `missing-target-description` | info | [Policy guidelines](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm) | Application definition without per-target description. |
| `non-standard-policy-naming` | info | [Policy guidelines](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm) | Custom policy name not matching `[Bundle] – [Apps] – [Descriptor]` or common prefixes. |
| `default-app-group-only` | info | [Policy guidelines](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm) | Custom policy targets only default/out-of-the-box application groups. |
| `linux-broad-command` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Linux `LinuxCommand` with wildcard/unrestricted sudo command and no path constraints. |

## Duplicate groups vs intelligence

`summary.duplicateGroups` is still populated from duplicate findings for backward compatibility with the Overview duplicate section. Prefer the **Intelligence** tab for a unified view of all findings.

## Out of scope

- Runtime doc scraping
- Auto-fix / policy editing
- **Time-of-day / network restriction conflicts** — restrictions not fully modeled in export XML
- **Least-privilege elevation scope** — cannot infer “minimum necessary” from XML alone

---

## Doc-driven rule backlog (maintainer checklist)

CyberArk guidance is **not** crawled automatically. Use this checklist when reviewing public docs for new Intelligence rules.

### Primary doc sources

| Source | URL | Topics useful for Intelligence |
|--------|-----|--------------------------------|
| EPM Server User Guide — Definition properties | [definitionproperties.htm](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Definition limits, protected folders, inheritance, env-var paths |
| EPM Server User Guide — Application policy guidelines | [policyguidelines.htm](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/policyguidelines.htm) | Naming, descriptions, app groups, audit, least-privilege design |
| Policies — Access filesystem/registry | [accessfilesystemregistry-newui.htm](https://docs.cyberark.com/epm/latest/en/content/policies/accessfilesystemregistry-newui.htm) | Set Security, protected agent paths, allowAccess |
| Security — Best practices | [security best practices.htm](https://docs.cyberark.com/epm/latest/en/content/security/security%20best%20practices.htm) | Publisher + path vs checksum, block/allow strategy, least privilege |
| Community — Explorer + child processes | [KB 000025602](https://community.cyberark.com/s/article/EPM-Policies-for-Explorer-exe-with-child-processes) | explorer.exe + inheritable policies |

### Feasibility legend

| Feasibility | Meaning |
|-------------|---------|
| **Ready** | Required fields already parsed; rule can be added with helpers only |
| **Parser gap** | Concept is clear but XML field is missing or incomplete in `parsePolicyDocument` / `buildTargets` — extend parser first |
| **Heuristic** | Doc is qualitative; rule needs curated lists or conservative thresholds to limit false positives |
| **Not automatable** | Organizational guidance with no reliable signal in policy XML |

### Backlog (remaining)

| Status | Candidate rule | Notes |
|--------|----------------|-------|
| **Shipped** | All feasible rows from prior backlog | See v1 rules table above (16 rules) |
| Skipped | Time-of-day / network restriction conflicts | Not automatable — restrictions not in export XML |
| Skipped | Least-privilege elevation scope | Not automatable — cannot infer minimum permissions from XML |

### Maintainer workflow

1. **Pick a backlog row** — start with **Ready** + **Low/Medium** false-positive risk.
2. **Validate on real XML** — use exports in `reference/` and customer samples; confirm detection rate and false positives.
3. **Implement** — add `rules/myRule.ts`, helpers/data if needed, one line in `rules/index.ts`.
4. **Document** — move row to **v1 rules** table; add `docUrl` and detection summary.
5. **UI** — default `FindingDetailModal` is enough unless the rule needs a custom row (see `DefinitionLimitRow` pattern).

### Parser fields used by v1 rules

| Field | Source in XML | Used by |
|-------|---------------|---------|
| `PolicyEntry.description` | Policy `@desc` / `@description` or `<Description>` | `missing-policy-description` |
| `TargetEntry.description` | Target `@desc` / `@description` or `<Description>` | `missing-target-description` |
| `target.attributes.hash` | `<FileName hash="…" hashAlgorithm="…">` | `checksum-only-match`, `block-checksum-only` |
| `policy.implicit`, `customizedDefinitionCount`, `userGroups` | Policy attrs + baseline compare | `implicit-default-modified` |
| `ApplicationGroupEntry.isDefault` | Console defaults + usage heuristics | `default-app-group-only` |

### Notes on doc traversal

- Do **not** scrape [CyberArk docs home](https://docs.cyberark.com/epm/latest/en/content/resources/_topnav/cc_home.htm) at runtime.
- Periodically **manually review** Server User Guide → Policies, Security best practices, and release notes when upgrading EPM.
- Community articles (Salesforce KB) are valid sources but should be linked explicitly in `docUrl` like explorer.exe.
