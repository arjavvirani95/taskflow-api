import { describe, expect, it } from "vitest";
import { setup } from "./helpers.js";

describe("auth", () => {
  it("registers and logs in a user", async () => {
    const { app } = await setup();
    const payload = { email: "Ada@Example.com", password: "s3cret-pass" };
    const reg = await app.inject({ method: "POST", url: "/auth/register", payload });
    expect(reg.statusCode).toBe(201);
    expect(reg.json().email).toBe("ada@example.com");

    const login = await app.inject({ method: "POST", url: "/auth/login", payload });
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toBeTypeOf("string");
  });

  it("rejects duplicate emails", async () => {
    const { app, register } = await setup();
    await register("dup@test.dev");
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "dup@test.dev", password: "s3cret-pass" } });
    expect(res.statusCode).toBe(409);
  });

  it("rejects bad credentials", async () => {
    const { app, register } = await setup();
    await register("bob@test.dev");
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "bob@test.dev", password: "wrong-pass" } });
    expect(res.statusCode).toBe(401);
  });

  it("validates input", async () => {
    const { app } = await setup();
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "nope", password: "short" } });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toHaveLength(2);
  });
});
