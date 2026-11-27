// Storage: one JSON file per Session in a folder.
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

    /** Every readable stored Session, newest first. Files that cannot be read or have an unknown shape are ignored. */
    list() {
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => readSession(join(dir, f)))
        .filter(Boolean)
        .sort((a, b) => b.startedAt - a.startedAt);
    },

    /** The stored Session with this identifier, or null. */
    load(id) {
      return this.list().find((data) => data.id === id) ?? null;
    },

    /** Deletes the file of the Session; false if there is none. */
    remove(id) {
      const found = this.load(id);
      if (!found) return false;
      rmSync(join(dir, `${id}.json`), { force: true });
      return true;
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
