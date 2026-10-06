import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";
import { registerErrorHandler, HttpError } from "./errors.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { taskRoutes } from "./routes/tasks.js";

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

  await app.register(swagger, {
    mode: "static",
    specification: { path: fileURLToPath(new URL("../openapi.yaml", import.meta.url)), baseDir: "" },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));
  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(taskRoutes);

  return app;
}
