import { describe, expect, it } from "vitest";

import {
  TRAINING_LOG_NAMES,
  TRAINING_LOG_SECTIONS,
} from "../lib/training-log-config";

describe("training log config", () => {
  it("includes Paris and Indy training cycles", () => {
    expect(TRAINING_LOG_SECTIONS).toEqual(
      expect.arrayContaining([
        { id: "paris-2026", name: "Paris 2026" },
        { id: "indy-2025", name: "Indy 2025" },
      ]),
    );
  });

  it("builds a lookup map for section names", () => {
    expect(TRAINING_LOG_NAMES["paris-2026"]).toBe("Paris 2026");
    expect(TRAINING_LOG_NAMES["indy-2025"]).toBe("Indy 2025");
  });
});
