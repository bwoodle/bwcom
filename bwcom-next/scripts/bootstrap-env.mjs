import { readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");
const examplePath = path.resolve(".env.local.example");

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseEnvLines(contents) {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = rawLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 1);
    values.set(key, value);
  }

  return values;
}

const exampleContents = await readFile(examplePath, "utf8");
const exampleLines = exampleContents
  .split(/\r?\n/)
  .filter((line) => line.trim() !== "");
const existingContents = (await fileExists(envPath))
  ? await readFile(envPath, "utf8")
  : "";
const existingValues = parseEnvLines(existingContents);

const missingLines = exampleLines.filter((line) => {
  const separatorIndex = line.indexOf("=");
  if (separatorIndex === -1) {
    return false;
  }

  const key = line.slice(0, separatorIndex).trim();
  const currentValue = existingValues.get(key);
  return currentValue === undefined || currentValue === "";
});

if (existingContents === "" || missingLines.length > 0) {
  const normalizedExisting =
    existingContents.endsWith("\n") || existingContents === ""
      ? existingContents
      : `${existingContents}\n`;
  const nextContents = `${normalizedExisting}${missingLines.join("\n")}${missingLines.length > 0 ? "\n" : ""}`;
  await writeFile(envPath, nextContents, "utf8");
  const action = existingContents === "" ? "created" : "updated";
  console.log(
    `Bootstrap env: ${action} ${path.relative(process.cwd(), envPath)}`,
  );
} else {
  console.log("Bootstrap env: .env.local already contains required values");
}
