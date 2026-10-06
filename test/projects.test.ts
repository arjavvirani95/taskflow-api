import { describe, expect, it } from "vitest";
import { setup } from "./helpers.js";

describe("projects", () => {
  it("requires authentication", async () => {
    const { app } = await setup();
    const res = await app.inject({ method: "GET", url: "/projects" });
    expect(res.statusCode).toBe(401);
  });

  it("supports full CRUD", async () => {
    const { app, register } = await setup();
    const { token } = await register();
    const headers = { authorization: `Bearer ${token}` };

    const created = await app.inject({ method: "POST", url: "/projects", headers, payload: { name: "Launch" } });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const updated = await app.inject({ method: "PATCH", url: `/projects/${id}`, headers, payload: { description: "Q4 launch" } });
    expect(updated.json()).toMatchObject({ name: "Launch", description: "Q4 launch" });

    const list = await app.inject({ method: "GET", url: "/projects", headers });
    expect(list.json()).toHaveLength(1);

    const del = await app.inject({ method: "DELETE", url: `/projects/${id}`, headers });
    expect(del.statusCode).toBe(204);
    const gone = await app.inject({ method: "GET", url: `/projects/${id}`, headers });
    expect(gone.statusCode).toBe(404);
  });

  it("isolates projects between users", async () => {
    const { app, register } = await setup();
    const alice = await register();
    const bob = await register();
    const created = await app.inject({
      method: "POST", url: "/projects",
      headers: { authorization: `Bearer ${alice.token}` }, payload: { name: "Secret" },
    });
    const res = await app.inject({
      method: "GET", url: `/projects/${created.json().id}`,
      headers: { authorization: `Bearer ${bob.token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
