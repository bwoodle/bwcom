export const TRAINING_LOG_TOOL_DESCRIPTIONS = {
    listTrainingLog: `List training log entries from the training log table.

If logId is provided (e.g. "paris-2026"), returns only entries for that training
cycle. Otherwise returns all entries.

The table contains two kinds of entries, distinguished by the sort key prefix:

1. **Daily workout entries** — sk starts with "daily#"
   Fields: logId, sk, date, slot ("workout1" or "workout2"), description, miles,
   highlight (boolean), createdAt

2. **Weekly summary entries** — sk starts with "week#"
  Fields: logId, sk, date (the Sunday that ends the week), description
   (summary text), miles (total for the week), createdAt

Always call this before attempting to remove or update an entry so you have
the exact logId and sk values.`,

    addDailyWorkout: `Add a single daily workout entry to the training log.

Each day can have up to 2 workouts: "workout1" (morning) and "workout2" (afternoon/evening).
If you are unsure whether a workout should be "workout1" or "workout2", ask a clarifying question to find out when the workout took place during the day.

**Required information — ask clarifying questions if any are missing:**
- logId: which training cycle (e.g. "paris-2026")
- date: the date of the workout (e.g. "2026-02-08")
- slot: "workout1" for morning or "workout2" for afternoon/evening
- description: what the workout was (see formatting rules below)
- miles: distance in miles (number)

Optional:
- highlight: set to true for key workouts (long runs, races, breakthrough sessions)

**Description formatting rules:**

- Single-activity workouts: Do NOT include the mileage total in the description
  — it is recorded separately in the miles field, and isn't helpful for a single activity.
  Just describe the activity.
  Example: "5 mile easy run" becomes "Easy run"

- Multi-activity workouts (more than one activity in a single slot): The user will provide each activity on a separate line (use \\n).
  If a mileage or time is provided for an individual activity, begin that line with it.
  Examples:
    "2.3 mile walk\\n4.5 mile run" (record 6.8 miles total to the miles field)
    "20 minutes of plyos\\n4.5 mile easy run" (record 4.5 miles total to the miles field)

- Capitalization: Reformat user-provided description using sentence-case. Words like "mile", "run", "treadmill",
  "easy", etc. should be lowercase unless they are the first word of a line.
  Examples: "4.5 Walk\\n10 Mile Easy run" becomes "4.5 mile walk\\n10 mile easy run",
    "20 Minutes of plyos\\n4.5 mile easy run" becomes "20 minutes of plyos\\n4.5 mile easy run"

`,

    addWeeklySummary: `Add a weekly summary entry to the training log.

A weekly summary adds an optional description/note to a training week. The
date should be the Sunday that ends the week. Weekly summaries are NOT
required — weeks are automatically discovered from daily workout entries.
The total miles for a week are always computed from the daily workouts.

Only add a weekly summary when the user wants to annotate a week with a note
or comment (e.g. "Solid base week; legs felt fresh.").

Parameters:
  logId       – training cycle ID (e.g. "paris-2026")
  date        – the Sunday ending the week, YYYY-MM-DD format
  description – brief summary/note about the week (supports multi-line with \\n)`,

    removeTrainingLogEntry: `Remove a training log entry (daily workout or weekly summary).

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listTrainingLog to discover the
exact logId and sk of the entry the user wants to delete.

Parameters:
  logId – the training cycle ID (e.g. "paris-2026")
  sk    – the exact sort key (e.g. "daily#2026-02-08#workout1" or "week#2026-02-08")

The entry is permanently deleted. This cannot be undone.`,

    updateTrainingLogEntry: `Update fields on an existing training log entry (daily or weekly).

Before calling this tool you MUST first call listTrainingLog to discover the
exact logId and sk of the entry the user wants to update.

You can update any combination of:
  description – new description text (supports multi-line with \\n)
  miles       – new mileage number
  highlight   – true to mark as key workout, false to remove highlight

Parameters:
  logId – the training cycle ID
  sk    – the exact sort key`,
};

export const TRAINING_LOG_ARG_DESCRIPTIONS = {
    logIdOptional: 'Training log ID (e.g. "paris-2026"). Omit to list all.',
    logId: 'Training log/cycle ID, e.g. "paris-2026".',
    date: 'Date in YYYY-MM-DD format, e.g. "2026-02-08".',
    slot: '"workout1" for morning, "workout2" for afternoon/evening.',
    description: 'Workout description. Supports multi-line with \\n.',
    miles: 'Distance in miles.',
    highlightOptional: 'True for key workouts (long runs, races, breakthroughs).',
    weeklyDate: 'The Sunday ending the week, YYYY-MM-DD format.',
    weeklyDescription: 'Brief summary/note about the training week. Supports multi-line with \\n.',
    deleteLogId: 'The logId (partition key) of the entry to delete.',
    deleteSk: 'The exact sk (sort key) of the entry to delete. Get this from listTrainingLog.',
    updateLogId: 'The logId (partition key) of the entry.',
    updateSk: 'The exact sk (sort key) of the entry. Get this from listTrainingLog.',
    updateDescription: 'New description text. Supports multi-line with \\n.',
    updateMiles: 'New mileage.',
    updateHighlight: 'True to mark as key workout, false to remove highlight.',
};
