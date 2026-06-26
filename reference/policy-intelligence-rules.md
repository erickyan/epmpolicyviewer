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
| `normalizePathForMatch`, `pathMatchesProtectedEntry` | Filesystem/registry path matching |

Protected paths are maintained in `backend/src/epm/intelligence/data/protectedPaths.ts`.

## v1 rules

| Rule ID | Severity | Doc | Detection summary |
|---------|----------|-----|-------------------|
| `definition-limit` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Policy `definitionCount` exceeds 1,000 (app-group members included in count). |
| `broad-publisher-audit` | warning | [Definition properties](https://docs.cyberark.com/epm/latest/en/content/epm/server%20user%20guide/definitionproperties.htm) | Audit enabled; every publisher-bearing target is publisher-only and uses macOS **Software Signing** or Windows **Microsoft Windows**. Skips implicit policies. |
| `protected-agent-path` | critical | [Access FS/registry](https://docs.cyberark.com/epm/latest/en/content/policies/accessfilesystemregistry-newui.htm) | Set Security (`action` 11) with `allowAccess` on an `FSEntry` or `RegKey` matching curated CyberArk agent paths. |
| `duplicate-policies` | info | — | Identical action + target signature + user targeting (user groups, or scope when untargeted), or duplicate policy names. Excludes implicit and “Installed by:” companion policies. |

## Duplicate groups vs intelligence

`summary.duplicateGroups` is still populated from duplicate findings for backward compatibility with the Overview duplicate section. Prefer the **Intelligence** tab for a unified view of all findings.

## Out of scope (v1)

- Runtime doc scraping
- Auto-fix / policy editing
- Linux-specific rules (add via the same registry when needed)
