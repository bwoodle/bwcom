export const MEDIA_TOOL_DESCRIPTIONS = {
  listMedia: `List media entries from the media tracking table.

If month and year are provided, returns only entries for that month.
Otherwise returns all entries, sorted newest month first.

Each item contains:
  monthKey  – partition key, e.g. "2026-02"
  sk        – sort key (timestamp#title), needed for updates and deletes
  title     – the title of the book, movie, show, etc.
  format    – e.g. "audiobook", "book", "movie", "TV", "podcast"
  comments  – optional multi-line comments/review (may be null)

Always call this before attempting to remove or update an entry so you have
the exact sk value.`,

  addMedia: `Add a new media entry to the tracking table.

Use this when the user says they consumed a book, movie, audiobook, TV show,
podcast, etc.

The comments field is optional and supports multi-line text. Use it for
reviews, thoughts, or notes about the media.

Examples:
  { month: "February", year: 2026, title: "Paradais", format: "audiobook",
    comments: "Jeselnik book club for February.\\nWild beginning chapter." }
  { month: "January", year: 2026, title: "The Bear Season 3", format: "TV" }`,

  removeMedia: `Remove a media entry from the tracking table.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listMedia to discover the exact
monthKey and sk of the entry the user wants to delete.

Parameters:
  monthKey – the partition key (e.g. "2026-02")
  sk       – the exact sort key (e.g. "2026-02-08T12:00:00.000Z#Paradais")

The entry is permanently deleted. This cannot be undone.`,

  updateMediaComments: `Update the comments on an existing media entry.

Before calling this tool you MUST first call listMedia to discover the exact
monthKey and sk of the entry the user wants to update.

The comments field supports multi-line text. Pass an empty string or omit
to clear the comments entirely.

Parameters:
  monthKey – the partition key (e.g. "2026-02")
  sk       – the exact sort key
  comments – new multi-line comments text, or empty string to clear`,
};

export const MEDIA_ARG_DESCRIPTIONS = {
  monthOptional: 'Month name (e.g. "February" or "Feb"). Omit to list all months.',
  yearOptional: 'Four-digit year (e.g. 2026). Required if month is provided.',
  monthRequired: 'Month name (e.g. "February", "Feb").',
  yearRequired: 'Four-digit year (e.g. 2026).',
  title: 'Title of the media (book, movie, show, etc.).',
  format: 'Format / medium — e.g. "audiobook", "book", "movie", "TV", "podcast".',
  commentsOptional:
    'Optional multi-line comments or review. Use newline characters (\\n) to separate lines.',
  monthKey: 'The monthKey (partition key) of the entry to delete.',
  skToDelete: 'The exact sk (sort key) of the entry to delete. Get this from listMedia.',
  skToUpdate: 'The exact sk (sort key) of the entry. Get this from listMedia.',
  commentsUpdate:
    'New comments text (supports multi-line with \\n). Omit or pass empty string to clear.',
};
