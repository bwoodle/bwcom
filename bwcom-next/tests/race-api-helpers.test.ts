import { describe, expect, it } from "vitest";

import {
  buildRaceUpdateMutation,
  validateRaceBatchUpdateRequest,
  validateRaceCreateRequest,
} from "../lib/races";

describe("validateRaceCreateRequest", () => {
  it("normalizes optional fields and defaults manual rows to manual source", () => {
    const result = validateRaceCreateRequest({
      date: "2018-03-17",
      distance: "5K",
      time: "18:00",
      vdot: 61.5,
      name: "  Road 5K  ",
      comments: "  Cool weather  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok result");
    }

    expect(result.value.name).toBe("Road 5K");
    expect(result.value.comments).toBe("Cool weather");
    expect(result.value.source).toBe("manual");
  });

  it("rejects invalid dates", () => {
    const result = validateRaceCreateRequest({
      date: "3/??/2015",
      distance: "5K",
      time: "18:00",
      vdot: 60,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected error result");
    }
    expect(result.error).toContain("date");
  });
});

describe("validateRaceBatchUpdateRequest", () => {
  it("requires at least one update field", () => {
    const result = validateRaceBatchUpdateRequest({
      updates: [{ yearKey: "2018", sk: "2018-03-17#5K" }],
    });

    expect(result.ok).toBe(false);
  });
});

describe("buildRaceUpdateMutation", () => {
  it("builds SET and REMOVE expressions for editable race fields", () => {
    const mutation = buildRaceUpdateMutation({
      yearKey: "2018",
      sk: "2018-03-17#5K",
      name: "Updated name",
      comments: null,
      validationState: "validated",
    });

    expect(mutation.updateExpression).toContain("SET");
    expect(mutation.updateExpression).toContain("REMOVE comments");
    expect(mutation.expressionAttributeValues).toEqual({
      ":name": "Updated name",
      ":validationState": "validated",
    });
  });
});
