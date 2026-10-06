import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";

describe("openDb", () => {
  it("applies all migrations", () => {
    const db = openDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tables).toEqual(expect.arrayContaining(["users", "projects", "tasks"]));
  });

  it("is idempotent", () => {
    const db = openDb();
    expect(() => openDb()).not.toThrow();
    const { v } = db.prepare("SELECT MAX(version) AS v FROM schema_version").get() as { v: number };
    expect(v).toBe(4);
  });
});
