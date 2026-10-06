# taskflow-api

[![CI](https://github.com/arjavvirani95/taskflow-api/actions/workflows/ci.yml/badge.svg)](https://github.com/arjavvirani95/taskflow-api/actions/workflows/ci.yml)

A task management REST API built with **Fastify 5**, **TypeScript**, **Zod** and Node's built-in **SQLite** (`node:sqlite`), so there are no native dependencies to compile.

## Features

- JWT authentication (register / login) with bcrypt password hashing
- Projects and tasks, scoped to the owning user
- Task filtering by status and priority, title search, sorting and pagination
- Request validation with Zod and consistent JSON error responses
- Versioned schema migrations
- OpenAPI 3 spec with Swagger UI at `/docs`
- Integration tests with Vitest using `fastify.inject` (no network needed)

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000, docs at /docs
npm test
```

| Env var      | Default                | Description                      |
|--------------|------------------------|----------------------------------|
| `PORT`       | `3000`                 | HTTP port                        |
| `DB_PATH`    | `:memory:`             | SQLite file path                 |
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to sign tokens       |

### Docker

```bash
docker build -t taskflow-api .
docker run -p 3000:3000 -e JWT_SECRET=change-me -e DB_PATH=/tmp/taskflow.db taskflow-api
```

## Example

```bash
TOKEN=$(curl -s localhost:3000/auth/register -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"s3cret-pass"}' | jq -r .token)

curl -s localhost:3000/projects -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"name":"Launch"}'

curl -s "localhost:3000/projects/1/tasks?status=todo&sort=priority" -H "authorization: Bearer $TOKEN"
```

## Project layout

```
src/
  app.ts            app factory (plugins, routes, error handler)
  db.ts             SQLite connection + migrations
  errors.ts         HttpError and central error handler
  routes/           auth, projects, tasks
test/               integration tests
openapi.yaml        API specification
```

## License

MIT
