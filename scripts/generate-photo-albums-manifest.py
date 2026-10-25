#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALBUMS_DIR = ROOT / "photos" / "albums"
OUTPUT_FILE = ROOT / "bwcom-spa" / "src" / "lib" / "photo-albums.generated.ts"
MONTH_KEY_LENGTH = 7
VALID_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def month_directories() -> list[Path]:
    if not ALBUMS_DIR.exists():
        return []

    month_dirs = [
        path
        for path in ALBUMS_DIR.iterdir()
        if path.is_dir() and len(path.name) == MONTH_KEY_LENGTH and path.name[4] == "-"
    ]
    return sorted(month_dirs, reverse=True)


def month_entries(month_dir: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for file_path in sorted(month_dir.iterdir()):
        if not file_path.is_file():
            continue

        file_name = file_path.name
        if file_name.endswith(":Zone.Identifier"):
            continue

        if file_path.suffix.lower() not in VALID_SUFFIXES:
            continue

        entries.append((month_dir.name, file_name))

    return entries


def render(entries: list[tuple[str, str]]) -> str:
    lines = [
        'import type { PhotoManifestEntry } from "./photo-albums";',
        "",
        "export const PHOTO_ALBUM_MANIFEST: PhotoManifestEntry[] = [",
    ]

    for month_key, file_name in entries:
        lines.append(f'  {{ monthKey: "{month_key}", name: "{file_name}" }},')

    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    entries: list[tuple[str, str]] = []
    for month_dir in month_directories():
        entries.extend(month_entries(month_dir))

    OUTPUT_FILE.write_text(render(entries), encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
