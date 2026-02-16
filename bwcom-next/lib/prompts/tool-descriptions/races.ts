export const RACE_TOOL_DESCRIPTIONS = {
  listRaces: `List race results from the race history table.

If year is provided, returns only results for that year.
Otherwise returns all results, sorted newest first.

Each item contains:
  yearKey   – partition key, e.g. "2026"
  sk        – sort key (date#distance), needed for updates and deletes
  date      – display date, e.g. "Feb 8, 2026"
  distance  – e.g. "5K", "Half Marathon", "Marathon"
  time      – finish time as a string, e.g. "3:12:45" or "18:30"
  vdot      – VDOT score, e.g. 67.0
  comments  – optional multi-line comments (may be null)

Always call this before attempting to remove or update an entry so you have
the exact yearKey and sk values.`,

  addRace: `Add a new race result to the race history table.

Use this when the user tells you about a race they ran.

**IMPORTANT: Before calling this tool, you MUST have ALL of the following:**
  - date     – the race date
  - distance – the race distance (e.g. "5K", "10K", "Half Marathon", "Marathon")
  - time     – the finish time
  - vdot     – the VDOT score

If the user has not provided any of these, ask a follow-up question to get
the missing information. Do NOT guess or assume values — especially VDOT.

Parameters:
  date     – the race date, e.g. "Feb 8, 2026" or "2026-02-08"
  distance – e.g. "5K", "10K", "Half Marathon", "Marathon"
  time     – finish time as a string, e.g. "3:12:45" or "18:30"
  vdot     – VDOT score as a number, e.g. 67.0
  comments – optional multi-line comments about the race`,

  removeRace: `Remove a race result from the race history table.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listRaces to discover the exact
yearKey and sk of the entry the user wants to delete.

Parameters:
  yearKey – the partition key (e.g. "2026")
  sk      – the exact sort key (e.g. "2026-02-08#5K")

The entry is permanently deleted. This cannot be undone.`,

  updateRace: `Update fields on an existing race result.

Before calling this tool you MUST first call listRaces to discover the exact
yearKey and sk of the entry the user wants to update.

You can update any combination of:
  time     – new finish time string
  vdot     – new VDOT score
  comments – new comments text (supports multi-line with \\n), or empty string to clear

**To change a race's date or distance**, use removeRace followed by addRace instead,
because date and distance are part of the key and cannot be updated in place.

Parameters:
  yearKey  – the partition key (e.g. "2026")
  sk       – the exact sort key (e.g. "2026-02-08#5K")
  time     – optional new finish time
  vdot     – optional new VDOT score
  comments – optional new comments text, or empty string to clear`,
};

export const RACE_ARG_DESCRIPTIONS = {
  yearOptional: 'Four-digit year (e.g. 2026). Omit to list all years.',
  date: 'Race date, e.g. "Feb 8, 2026" or "2026-02-08".',
  distance: 'Race distance, e.g. "5K", "10K", "Half Marathon", "Marathon".',
  time: 'Finish time as a string, e.g. "3:12:45" or "18:30".',
  vdot: 'VDOT score, e.g. 67.0.',
  commentsOptional:
    'Optional multi-line comments about the race. Use newline characters (\\n) to separate lines.',
  yearKeyDelete: 'The yearKey (partition key) of the entry to delete.',
  skDelete: 'The exact sk (sort key) of the entry to delete. Get this from listRaces.',
  yearKeyUpdate: 'The yearKey (partition key) of the entry.',
  skUpdate: 'The exact sk (sort key) of the entry. Get this from listRaces.',
  timeUpdate: 'New finish time string.',
  vdotUpdate: 'New VDOT score.',
  commentsUpdate: 'New comments text (supports multi-line with \\n). Pass empty string to clear.',
};
