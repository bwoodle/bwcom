import { tool } from "langchain";
import { z } from "zod";

import { docClient, RACES_TABLE_NAME } from "./dynamodb";
import {
  createRace,
  deleteRace,
  fetchAllRaces,
  updateRaces,
} from "./race-repository";
import {
  RACE_ARG_DESCRIPTIONS,
  RACE_TOOL_DESCRIPTIONS,
} from "./prompts/tool-descriptions/races";
import { validateRaceCreateRequest } from "./races";

export const listRaces = tool(
  async ({ year }) => {
    try {
      const items = await fetchAllRaces({
        client: docClient,
        tableName: RACES_TABLE_NAME,
      });
      const filtered = year
        ? items.filter((item) => item.yearKey === String(year))
        : items;
      return JSON.stringify(filtered, null, 2);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        success: false,
        error: `Failed to list races: ${message}`,
      });
    }
  },
  {
    name: "listRaces",
    description: RACE_TOOL_DESCRIPTIONS.listRaces,
    schema: z.object({
      year: z.number().optional().describe(RACE_ARG_DESCRIPTIONS.yearOptional),
    }),
  },
);

export const addRace = tool(
  async ({ date, distance, time, vdot, name, comments }) => {
    try {
      const validation = validateRaceCreateRequest({
        date,
        distance,
        time,
        vdot,
        name,
        comments,
      });
      if (!validation.ok) {
        return JSON.stringify({ success: false, error: validation.error });
      }

      const entry = await createRace({
        client: docClient,
        tableName: RACES_TABLE_NAME,
        request: validation.value,
      });

      return JSON.stringify({ success: true, ...entry }, null, 2);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        success: false,
        error: `Failed to add race: ${message}`,
      });
    }
  },
  {
    name: "addRace",
    description: RACE_TOOL_DESCRIPTIONS.addRace,
    schema: z.object({
      date: z.string().describe(RACE_ARG_DESCRIPTIONS.date),
      distance: z.string().describe(RACE_ARG_DESCRIPTIONS.distance),
      time: z.string().describe(RACE_ARG_DESCRIPTIONS.time),
      vdot: z.number().describe(RACE_ARG_DESCRIPTIONS.vdot),
      name: z.string().optional().describe(RACE_ARG_DESCRIPTIONS.nameOptional),
      comments: z
        .string()
        .optional()
        .describe(RACE_ARG_DESCRIPTIONS.commentsOptional),
    }),
  },
);

export const removeRace = tool(
  async ({ yearKey, sk }) => {
    try {
      await deleteRace({
        client: docClient,
        tableName: RACES_TABLE_NAME,
        yearKey,
        sk,
      });
      return JSON.stringify({ success: true, deleted: { yearKey, sk } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        success: false,
        error: `Failed to remove race: ${message}`,
      });
    }
  },
  {
    name: "removeRace",
    description: RACE_TOOL_DESCRIPTIONS.removeRace,
    schema: z.object({
      yearKey: z.string().describe(RACE_ARG_DESCRIPTIONS.yearKeyDelete),
      sk: z.string().describe(RACE_ARG_DESCRIPTIONS.skDelete),
    }),
  },
);

export const updateRace = tool(
  async ({ yearKey, sk, time, vdot, name, comments }) => {
    try {
      if (
        time === undefined &&
        vdot === undefined &&
        name === undefined &&
        comments === undefined
      ) {
        return JSON.stringify({
          success: false,
          error:
            "No fields to update. Provide at least one of: time, vdot, name, comments.",
        });
      }

      const result = await updateRaces({
        client: docClient,
        tableName: RACES_TABLE_NAME,
        updates: [
          {
            yearKey,
            sk,
            ...(time !== undefined ? { time } : {}),
            ...(vdot !== undefined ? { vdot } : {}),
            ...(name !== undefined ? { name: name || null } : {}),
            ...(comments !== undefined ? { comments: comments || null } : {}),
          },
        ],
      });

      if (!result.results[0]?.success) {
        return JSON.stringify({
          success: false,
          error: result.results[0]?.error ?? "Failed to update race",
        });
      }

      return JSON.stringify({
        success: true,
        yearKey,
        sk,
        updated: { time, vdot, name, comments },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        success: false,
        error: `Failed to update race: ${message}`,
      });
    }
  },
  {
    name: "updateRace",
    description: RACE_TOOL_DESCRIPTIONS.updateRace,
    schema: z.object({
      yearKey: z.string().describe(RACE_ARG_DESCRIPTIONS.yearKeyUpdate),
      sk: z.string().describe(RACE_ARG_DESCRIPTIONS.skUpdate),
      time: z.string().optional().describe(RACE_ARG_DESCRIPTIONS.timeUpdate),
      vdot: z.number().optional().describe(RACE_ARG_DESCRIPTIONS.vdotUpdate),
      name: z.string().optional().describe(RACE_ARG_DESCRIPTIONS.nameUpdate),
      comments: z
        .string()
        .optional()
        .describe(RACE_ARG_DESCRIPTIONS.commentsUpdate),
    }),
  },
);

export const raceTools = [listRaces, addRace, removeRace, updateRace];
