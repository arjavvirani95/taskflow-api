import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "ValidationError",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).send({ error: status >= 500 ? "Internal Server Error" : (err as Error).message });
  });
}
