import { expect, it } from "vitest";
import { buildApp } from "../src/app.js";

it("serves the OpenAPI spec", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/docs/json" });
  expect(res.statusCode).toBe(200);
  expect(res.json().info.title).toBe("Taskflow API");
});
