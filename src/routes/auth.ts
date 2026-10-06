import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { HttpError } from "../errors.js";

const Credentials = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const { email, password } = Credentials.parse(req.body);
    const exists = app.db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
    if (exists) throw new HttpError(409, "Email already registered");

    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = app.db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email, hash);
    const id = Number(lastInsertRowid);
    return reply.status(201).send({ id, email, token: app.jwt.sign({ sub: id }) });
  });

  app.post("/auth/login", async (req) => {
    const { email, password } = Credentials.parse(req.body);
    const user = app.db
      .prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .get(email) as { id: number; password_hash: string } | undefined;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    return { token: app.jwt.sign({ sub: user.id }) };
  });
}
