"""Exact-date dedupe helpers for legacy race imports."""

from __future__ import annotations

from dataclasses import replace

from legacy_races_pipeline.models import ClassifiedLegacyRaceRow


def apply_date_dedupe(
    rows: list[ClassifiedLegacyRaceRow],
    occupied_dates: set[str],
) -> list[ClassifiedLegacyRaceRow]:
    """Exclude existing dates and route in-batch duplicates to manual review."""
    seen_dates: set[str] = set()
    deduped: list[ClassifiedLegacyRaceRow] = []

    for row in rows:
        if row.classification != "ready-to-stage" or row.normalized is None:
            deduped.append(row)
            continue

        iso_date = row.normalized.iso_date
        if iso_date in occupied_dates:
            deduped.append(
                replace(
                    row,
                    classification="excluded-existing-date",
                    reasons=["A race already exists for this calendar date."],
                    normalized=None,
                )
            )
            continue

        if iso_date in seen_dates:
            deduped.append(
                replace(
                    row,
                    classification="manual-review-duplicate-date",
                    reasons=["Another spreadsheet row already claims this date."],
                    normalized=None,
                )
            )
            continue

        seen_dates.add(iso_date)
        deduped.append(row)

    return deduped
