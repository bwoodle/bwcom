import { describe, expect, it } from "vitest";

import {
  buildRaceSk,
  extractCalendarDate,
  formatDisplayDate,
  hasRaceDraftChanges,
  nextRaceItem,
  toRaceItem,
} from "../lib/races";
import type { RaceItem } from "../types/races";

const baseRace: RaceItem = {
  yearKey: "2018",
  sk: "2018-03-17#5K",
  date: "Mar 17, 2018",
  distance: "5K",
  time: "18:00",
  vdot: 61.5,
  name: "Road 5K",
  comments: "Cool weather",
  source: "legacy-spreadsheet",
  importBatchId: "batch-123",
  legacySourceRowId: "Legacy!2",
  validationState: "staged",
  createdAt: "2026-03-01T12:00:00Z",
};

describe("race key helpers", () => {
  it("builds sortable sort keys and extracts calendar dates", () => {
    expect(buildRaceSk("2018-03-17", "5K")).toBe("2018-03-17#5K");
    expect(extractCalendarDate("2018-03-17#5K")).toBe("2018-03-17");
  });

  it("formats UTC display dates", () => {
    expect(formatDisplayDate("2018-03-17")).toBe("Mar 17, 2018");
  });
});

describe("toRaceItem", () => {
  it("maps optional legacy metadata from Dynamo items", () => {
    const item = toRaceItem({
      ...baseRace,
      promotedAt: "2026-03-05T01:02:03Z",
    });

    expect(item.name).toBe("Road 5K");
    expect(item.validationState).toBe("staged");
    expect(item.promotedAt).toBe("2026-03-05T01:02:03Z");
  });
});

describe("race editor helpers", () => {
  it("detects staged row changes", () => {
    expect(
      hasRaceDraftChanges(baseRace, {
        name: "Updated name",
      }),
    ).toBe(true);
    expect(hasRaceDraftChanges(baseRace, {})).toBe(false);
  });

  it("applies edits and validation-state changes immutably", () => {
    const next = nextRaceItem(baseRace, {
      yearKey: baseRace.yearKey,
      sk: baseRace.sk,
      name: "Updated name",
      comments: null,
      validationState: "validated",
    });

    expect(next.name).toBe("Updated name");
    expect(next.comments).toBeUndefined();
    expect(next.validationState).toBe("validated");
    expect(baseRace.name).toBe("Road 5K");
  });
});
