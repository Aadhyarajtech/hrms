import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "hrms.sqlite");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

function resolveSchemaPath(): string {
  const candidates = [
    path.join(process.cwd(), "dist", "db", "schema.sql"),
    path.join(process.cwd(), "src", "db", "schema.sql"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Could not locate schema.sql in dist/db or src/db.");
  return found;
}

export function runMigrations() {
  const schema = fs.readFileSync(resolveSchemaPath(), "utf-8");
  db.exec(schema);
}

/** Convenience: row helpers since node:sqlite returns `null`-prototype objects */
export function one<T = any>(sql: string, params: Record<string, any> = {}): T | undefined {
  return db.prepare(sql).get(params) as T | undefined;
}

export function all<T = any>(sql: string, params: Record<string, any> = {}): T[] {
  return db.prepare(sql).all(params) as T[];
}

export function run(sql: string, params: Record<string, any> = {}) {
  return db.prepare(sql).run(params);
}

export function nowIso(): string {
  return new Date().toISOString();
}
