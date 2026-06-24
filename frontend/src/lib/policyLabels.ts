// Actions where categoryLabel is the preferred UI label; raw actionLabel from the
// XML spec (e.g. "Normal Run" for action 1) is redundant in the policy header.
const CATEGORY_CANONICAL_ACTIONS = new Set(["1", "4", "13", "17", "20", "23"])

export const shouldShowActionBadge = (
  action: string,
  actionLabel: string,
  categoryLabel: string
): boolean => {
  if (CATEGORY_CANONICAL_ACTIONS.has(action)) return false
  return (
    actionLabel.localeCompare(categoryLabel, undefined, { sensitivity: "accent" }) !==
    0
  )
}
