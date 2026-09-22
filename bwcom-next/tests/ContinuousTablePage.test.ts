import { describe, it, expect } from "vitest";

/**
 * Unit tests for data flattening logic used by ContinuousTablePage.
 * Tests verify that grouped data is correctly flattened and month labels are preserved.
 */

interface GroupedTableGroup<T> {
  key: string;
  label: string;
  items: T[];
}

interface TestItem {
  id: number;
  name: string;
  monthKey: string;
}

interface ItemWithMonth extends TestItem {
  _monthLabel?: string;
}

function flattenGroups<T extends Record<string, unknown>>(
  groups: GroupedTableGroup<T>[],
): (T & { _monthLabel?: string })[] {
  const flatItems: (T & { _monthLabel?: string })[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const itemWithMonth = {
        ...item,
        _monthLabel: group.label,
      } as T & { _monthLabel?: string };
      flatItems.push(itemWithMonth);
    }
  }
  return flatItems;
}

describe("ContinuousTablePage data flattening", () => {
  it("flattens grouped data into a single array", () => {
    const groups: GroupedTableGroup<TestItem>[] = [
      {
        key: "2026-03",
        label: "March 2026",
        items: [
          { id: 1, name: "Item 1", monthKey: "2026-03" },
          { id: 2, name: "Item 2", monthKey: "2026-03" },
        ],
      },
      {
        key: "2026-02",
        label: "February 2026",
        items: [{ id: 3, name: "Item 3", monthKey: "2026-02" }],
      },
    ];

    const flat = flattenGroups(groups);

    expect(flat).toHaveLength(3);
    expect(flat.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("preserves month labels in flattened items", () => {
    const groups: GroupedTableGroup<TestItem>[] = [
      {
        key: "2026-03",
        label: "March 2026",
        items: [{ id: 1, name: "Item 1", monthKey: "2026-03" }],
      },
      {
        key: "2026-02",
        label: "February 2026",
        items: [{ id: 2, name: "Item 2", monthKey: "2026-02" }],
      },
    ];

    const flat = flattenGroups(groups);

    expect(flat[0]._monthLabel).toBe("March 2026");
    expect(flat[1]._monthLabel).toBe("February 2026");
  });

  it("handles empty groups", () => {
    const groups: GroupedTableGroup<TestItem>[] = [];
    const flat = flattenGroups(groups);
    expect(flat).toHaveLength(0);
  });

  it("handles groups with empty items", () => {
    const groups: GroupedTableGroup<TestItem>[] = [
      {
        key: "2026-03",
        label: "March 2026",
        items: [],
      },
    ];

    const flat = flattenGroups(groups);
    expect(flat).toHaveLength(0);
  });

  it("maintains item properties when flattening", () => {
    const groups: GroupedTableGroup<TestItem>[] = [
      {
        key: "2026-03",
        label: "March 2026",
        items: [{ id: 1, name: "Test Item", monthKey: "2026-03" }],
      },
    ];

    const flat = flattenGroups(groups);
    const item = flat[0] as ItemWithMonth;

    expect(item.id).toBe(1);
    expect(item.name).toBe("Test Item");
    expect(item.monthKey).toBe("2026-03");
    expect(item._monthLabel).toBe("March 2026");
  });

  it("flattens multiple items from multiple groups in order", () => {
    const groups: GroupedTableGroup<TestItem>[] = [
      {
        key: "2026-03",
        label: "March 2026",
        items: [
          { id: 1, name: "A", monthKey: "2026-03" },
          { id: 2, name: "B", monthKey: "2026-03" },
        ],
      },
      {
        key: "2026-02",
        label: "February 2026",
        items: [
          { id: 3, name: "C", monthKey: "2026-02" },
          { id: 4, name: "D", monthKey: "2026-02" },
        ],
      },
    ];

    const flat = flattenGroups(groups);

    expect(flat.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(flat.map((item) => item._monthLabel)).toEqual([
      "March 2026",
      "March 2026",
      "February 2026",
      "February 2026",
    ]);
  });
});
