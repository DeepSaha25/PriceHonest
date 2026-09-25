import fs from "fs";
import path from "path";
import { Observation } from "../types";
import { normalizeKey } from "./cache";

const DATA_DIR = path.resolve(__dirname, "../../.data");
const DATA_FILE = path.join(DATA_DIR, "observations.json");
const MAX_PER_QUERY = 20;

type ObservationMap = Record<string, Observation[]>;

function readAll(): ObservationMap {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ObservationMap;
  } catch {
    return {};
  }
}

function writeAll(data: ObservationMap): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data), "utf8");
    fs.renameSync(temp, DATA_FILE);
  } catch {
    // Persistence is supplementary; a read-only deployment must still return a report.
  }
}

export function getObservations(query: string): Observation[] {
  const values = readAll()[normalizeKey(query)] ?? [];
  return values
    .filter((item) => item && typeof item.checkedAt === "string")
    .slice(-MAX_PER_QUERY);
}

export function recordObservation(
  query: string,
  observation: Observation,
): Observation[] {
  const all = readAll();
  const key = normalizeKey(query);
  const previous = Array.isArray(all[key]) ? all[key] : [];
  if (!previous.some((item) => item.checkedAt === observation.checkedAt))
    previous.push(observation);
  all[key] = previous.slice(-MAX_PER_QUERY);
  writeAll(all);
  return all[key];
}

export function dataFilePath(): string {
  return DATA_FILE;
}
