// Storage: one JSON file per Session in a folder.
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function createStorage(dir) {
  mkdirSync(dir, { recursive: true });
  return {
    /** Writes the complete state of the Session (atomic write). */
    save(data) {
      const file = join(dir, `${data.id}.json`);
      writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2));
      renameSync(`${file}.tmp`, file);
    },

    /** The unfinished Session started last, or null. Files that cannot be read or have an unknown shape are ignored. */
    lastInProgress() {
      return (
        readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => readSession(join(dir, f)))
          .filter((d) => d && !d.ended)
          .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
      );
    },
  };
}

function readSession(file) {
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    const valid = Array.isArray(data?.steps) && Array.isArray(data.players) && typeof data.startedAt === "number";
    return valid ? data : null;
  } catch {
    return null;
  }
}
