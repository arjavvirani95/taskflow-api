import { buildApp } from "../src/app.js";

export async function setup() {
  const app = await buildApp();
  async function register(email = `user${Math.random().toString(36).slice(2)}@test.dev`) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "s3cret-pass" } });
    return res.json() as { id: number; token: string };
  }
  return { app, register };
}
