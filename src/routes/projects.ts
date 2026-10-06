import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound } from "../errors.js";

const ProjectInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional(),
});
const IdParam = z.object({ id: z.coerce.number().int().positive() });

export interface Project {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export function findOwnedProject(app: FastifyInstance, id: number, ownerId: number): Project {
  const project = app.db
    .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
    .get(id, ownerId) as Project | undefined;
  if (!project) throw notFound("Project");
  return project;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects", async (req) =>
    app.db.prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC, id DESC").all(req.user.sub),
  );

  app.post("/projects", async (req, reply) => {
    const { name, description } = ProjectInput.parse(req.body);
    const { lastInsertRowid } = app.db
      .prepare("INSERT INTO projects (owner_id, name, description) VALUES (?, ?, ?)")
      .run(req.user.sub, name, description ?? null);
    return reply.status(201).send(findOwnedProject(app, Number(lastInsertRowid), req.user.sub));
  });

  app.get("/projects/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return findOwnedProject(app, id, req.user.sub);
  });

  app.patch("/projects/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    const patch = ProjectInput.partial().parse(req.body);
    const current = findOwnedProject(app, id, req.user.sub);
    app.db
      .prepare("UPDATE projects SET name = ?, description = ? WHERE id = ?")
      .run(patch.name ?? current.name, patch.description ?? current.description, id);
    return findOwnedProject(app, id, req.user.sub);
  });

  app.delete("/projects/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    findOwnedProject(app, id, req.user.sub);
    app.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    return reply.status(204).send();
  });
}
