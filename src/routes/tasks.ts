import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound } from "../errors.js";
import { findOwnedProject } from "./projects.js";

const Status = z.enum(["todo", "in_progress", "done"]);
const TaskInput = z.object({
  title: z.string().trim().min(1).max(200),
  status: Status.default("todo"),
  priority: z.number().int().min(1).max(3).default(2),
  due_date: z.string().date().nullable().optional(),
});
const TaskPatch = z.object({
  title: z.string().trim().min(1).max(200),
  status: Status,
  priority: z.number().int().min(1).max(3),
  due_date: z.string().date().nullable(),
}).partial();
const ListQuery = z.object({
  status: Status.optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  q: z.string().optional(),
  sort: z.enum(["created_at", "due_date", "priority"]).default("created_at"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
const ProjectParam = z.object({ projectId: z.coerce.number().int().positive() });
const TaskParam = ProjectParam.extend({ taskId: z.coerce.number().int().positive() });

interface Task {
  id: number;
  project_id: number;
  title: string;
  status: z.infer<typeof Status>;
  priority: number;
  due_date: string | null;
  created_at: string;
}

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  const getTask = (projectId: number, taskId: number): Task => {
    const task = app.db
      .prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?")
      .get(taskId, projectId) as Task | undefined;
    if (!task) throw notFound("Task");
    return task;
  };

  app.get("/projects/:projectId/tasks", async (req) => {
    const { projectId } = ProjectParam.parse(req.params);
    findOwnedProject(app, projectId, req.user.sub);
    const q = ListQuery.parse(req.query);

    const where = ["project_id = ?"];
    const args: (string | number)[] = [projectId];
    if (q.status) { where.push("status = ?"); args.push(q.status); }
    if (q.priority) { where.push("priority = ?"); args.push(q.priority); }
    if (q.q) { where.push("title LIKE ?"); args.push(`%${q.q}%`); }
    const clause = where.join(" AND ");
    // sort is validated against an enum above, so interpolation is safe
    const order = q.sort === "due_date" ? "due_date IS NULL, due_date" : q.sort;

    const items = app.db
      .prepare(`SELECT * FROM tasks WHERE ${clause} ORDER BY ${order}, id LIMIT ? OFFSET ?`)
      .all(...args, q.limit, q.offset);
    const { total } = app.db.prepare(`SELECT COUNT(*) AS total FROM tasks WHERE ${clause}`).get(...args) as { total: number };
    return { items, total, limit: q.limit, offset: q.offset };
  });

  app.post("/projects/:projectId/tasks", async (req, reply) => {
    const { projectId } = ProjectParam.parse(req.params);
    findOwnedProject(app, projectId, req.user.sub);
    const t = TaskInput.parse(req.body);
    const { lastInsertRowid } = app.db
      .prepare("INSERT INTO tasks (project_id, title, status, priority, due_date) VALUES (?, ?, ?, ?, ?)")
      .run(projectId, t.title, t.status, t.priority, t.due_date ?? null);
    return reply.status(201).send(getTask(projectId, Number(lastInsertRowid)));
  });

  app.patch("/projects/:projectId/tasks/:taskId", async (req) => {
    const { projectId, taskId } = TaskParam.parse(req.params);
    findOwnedProject(app, projectId, req.user.sub);
    const next = { ...getTask(projectId, taskId), ...TaskPatch.parse(req.body) };
    app.db
      .prepare("UPDATE tasks SET title = ?, status = ?, priority = ?, due_date = ? WHERE id = ?")
      .run(next.title, next.status, next.priority, next.due_date, taskId);
    return getTask(projectId, taskId);
  });

  app.delete("/projects/:projectId/tasks/:taskId", async (req, reply) => {
    const { projectId, taskId } = TaskParam.parse(req.params);
    findOwnedProject(app, projectId, req.user.sub);
    getTask(projectId, taskId);
    app.db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
    return reply.status(204).send();
  });
}
