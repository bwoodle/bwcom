"""Tests for legacy_races_pipeline.parser."""

from __future__ import annotations

from openpyxl import Workbook
from openpyxl.styles import Font

from legacy_races_pipeline.parser import parse_workbook


def test_parse_workbook_reads_rows_and_strikethrough_metadata(tmp_path):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Legacy Races"
    worksheet.append(["Date", "Race Name", "5K", "Notes"])
    worksheet.append(["2014-05-01", "Spring 5K", "18:30", "Windy"])
    worksheet.append(["2014-05-08", "Already Added", "18:45", "Skip me"])

    for cell in worksheet[3]:
        cell.font = Font(strike=True)

    path = tmp_path / "legacy-races.xlsx"
    workbook.save(path)

    rows = parse_workbook(path)

    assert len(rows) == 2
    assert rows[0].row_id == "Legacy Races!2"
    assert rows[0].values["Date"] == "2014-05-01"
    assert rows[0].formatting_available is True
    assert rows[0].has_strikethrough is False
    assert rows[1].formatting_available is True
    assert rows[1].has_strikethrough is True


def test_parse_workbook_flags_missing_formatting_when_only_default_styles_exist(
    tmp_path,
):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Sheet1"
    worksheet.append(["Date", "Race Name", "5K"])
    worksheet.append(["2015-03-14", "Road 5K", "17:59"])

    path = tmp_path / "legacy-races-no-styles.xlsx"
    workbook.save(path)

    rows = parse_workbook(path)

    assert len(rows) == 1
    assert rows[0].formatting_available is False
    assert rows[0].has_strikethrough is False
