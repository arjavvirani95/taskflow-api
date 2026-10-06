import "@fastify/jwt";
import type { Db } from "./db.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    authenticate: (req: FastifyRequest) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: number };
    user: { sub: number };
  }
}
