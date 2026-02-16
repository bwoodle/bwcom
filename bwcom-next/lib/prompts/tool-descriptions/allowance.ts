export const ALLOWANCE_TOOL_DESCRIPTIONS = {
  listRecentAllowanceEntries: `List the most recent allowance entries for one or both children.

This returns the same data that is displayed on the admin page: the current
balance and the last 10 transactions for each child requested.

Use this tool:
- When the user asks about a child's balance or recent activity.
- **Before** calling removeAllowanceEntry, so you know the exact timestamp
  of the entry the user wants to remove.

The result is a JSON array with one object per child, each containing:
  childName  – "Preston" or "Leighton"
  balance    – current total balance (sum of all amounts ever)
  recentEntries – array of the 10 most recent items, each with:
      timestamp   – ISO-8601 sort key (e.g. "2026-02-08T10:00:00Z")
      date        – human-readable date string
      description – what the entry is for
      amount      – signed number (positive = accrued/earned, negative = spent)`,

  addAllowanceEntry: `Add a new allowance entry for a child (Preston or Leighton).

Use this tool when the user asks you to record a new allowance transaction.
You should generate a short, human-readable description for the entry.

Amount sign convention:
  positive number → money earned / accrued (e.g. weekly allowance, bonus)
  negative number → money spent / deducted (e.g. buying a toy, a fine)

Examples:
  { childName: "Preston", amount: 10, description: "Weekly allowance" }
  { childName: "Leighton", amount: -4.50, description: "Bought stickers" }

The entry is written to DynamoDB with an auto-generated ISO-8601 timestamp as
the sort key. The result confirms the written record including the timestamp.`,

  removeAllowanceEntry: `Remove an existing allowance entry for a child.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**
Describe which entry you are about to delete and wait for the user to confirm.

Before calling this tool you MUST first call listRecentAllowanceEntries to
discover the exact timestamp (ISO-8601 sort key) of the entry to remove.
The timestamp is the unique identifier for the entry within that child's
records.

Parameters:
  childName – "Preston" or "Leighton"
  timestamp – the exact ISO-8601 timestamp of the entry to delete
              (e.g. "2026-02-08T10:00:00Z")

The entry is permanently deleted from DynamoDB. This cannot be undone.`,
};

export const ALLOWANCE_ARG_DESCRIPTIONS = {
  childNameOptional: 'The child to query. Omit to return data for both Preston and Leighton.',
  childNameRequired: 'The child to add the entry for.',
  amount: 'The dollar amount. Positive = earned/accrued, negative = spent/deducted.',
  description:
    'A short human-readable description of the transaction (e.g. "Weekly allowance", "Bought a book").',
  removeChildName: 'The child whose entry should be removed.',
  timestamp:
    'The exact ISO-8601 timestamp (sort key) of the entry to delete. Obtain this from listRecentAllowanceEntries first.',
};
