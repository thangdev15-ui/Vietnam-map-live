import "dotenv/config";
import { Store } from "../apps/backend/src/database";
import { defaults } from "../packages/shared/index";
const db = new Store(process.env.DATABASE_PATH ?? "data/game.sqlite");
if (!db.get("settings")) db.set("settings", defaults);
db.db.close();
console.log("Schema v1 and default settings ready");
