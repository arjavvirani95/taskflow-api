import { beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { setup } from "./helpers.js";

let app: FastifyInstance;
let headers: Record<string, string>;
let base: string;

beforeEach(async () => {
  const ctx = await setup();
  app = ctx.app;
  headers = { authorization: `Bearer ${(await ctx.register()).token}` };
  const project = await app.inject({ method: "POST", url: "/projects", headers, payload: { name: "P" } });
  base = `/projects/${project.json().id}/tasks`;
});

const create = (payload: object) => app.inject({ method: "POST", url: base, headers, payload });

describe("tasks", () => {
  it("creates a task with defaults", async () => {
    const res = await create({ title: "Write docs" });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ title: "Write docs", status: "todo", priority: 2, due_date: null });
  });

  it("filters, searches and paginates", async () => {
    await create({ title: "Fix login bug", priority: 1 });
    await create({ title: "Fix signup bug", status: "done" });
    await create({ title: "Design landing page" });

    const fixes = await app.inject({ method: "GET", url: `${base}?q=Fix`, headers });
    expect(fixes.json().total).toBe(2);

    const done = await app.inject({ method: "GET", url: `${base}?status=done`, headers });
    expect(done.json().items.map((t: { title: string }) => t.title)).toEqual(["Fix signup bug"]);

    const page = await app.inject({ method: "GET", url: `${base}?sort=priority&limit=1&offset=0`, headers });
    expect(page.json()).toMatchObject({ total: 3, limit: 1 });
    expect(page.json().items[0].title).toBe("Fix login bug");
  });

  it("updates and deletes a task", async () => {
    const { id } = (await create({ title: "Ship it" })).json();
    const patched = await app.inject({ method: "PATCH", url: `${base}/${id}`, headers, payload: { status: "in_progress" } });
    expect(patched.json().status).toBe("in_progress");

    const del = await app.inject({ method: "DELETE", url: `${base}/${id}`, headers });
    expect(del.statusCode).toBe(204);
  });

  it("rejects invalid status", async () => {
    const res = await create({ title: "x", status: "blocked" });
    expect(res.statusCode).toBe(400);
  });
});
