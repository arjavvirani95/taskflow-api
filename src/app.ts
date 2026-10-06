import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { openDb } from "./db.js";
import { registerErrorHandler, HttpError } from "./errors.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";

export interface AppOptions {
  logger?: boolean;
  dbPath?: string;
  jwtSecret?: string;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.decorate("db", openDb(opts.dbPath));
  app.addHook("onClose", async () => app.db.close());

  await app.register(jwt, { secret: opts.jwtSecret ?? process.env.JWT_SECRET ?? "dev-secret-change-me" });
  app.decorate("authenticate", async (req) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new HttpError(401, "Unauthorized");
    }
  });

  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));
  await app.register(authRoutes);
  await app.register(projectRoutes);

  return app;
}
