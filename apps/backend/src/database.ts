import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,at INTEGER NOT NULL,source TEXT NOT NULL,type TEXT NOT NULL,username TEXT NOT NULL,result TEXT NOT NULL); CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,at INTEGER NOT NULL,state TEXT NOT NULL); INSERT OR IGNORE INTO migrations VALUES(1);`,
    );
    const columns = this.db.prepare("PRAGMA table_info(events)").all() as {
      name: string;
    }[];
    if (!columns.some((c) => c.name === "details"))
      this.db.exec(
        "ALTER TABLE events ADD COLUMN details TEXT NOT NULL DEFAULT '{}'",
      );
    this.db.exec("INSERT OR IGNORE INTO migrations VALUES(2)");
  }
  transaction(fn: () => void) {
    this.db.exec("BEGIN");
    try {
      fn();
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  get<T>(key: string): T | undefined {
    const r = this.db.prepare("SELECT value FROM kv WHERE key=?").get(key) as
      { value: string } | undefined;
    return r ? JSON.parse(r.value) : undefined;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO kv VALUES(?,?)")
      .run(key, JSON.stringify(value));
  }
  logs() {
    return this.db
      .prepare("SELECT * FROM events ORDER BY at DESC LIMIT 200")
      .all();
  }
}
