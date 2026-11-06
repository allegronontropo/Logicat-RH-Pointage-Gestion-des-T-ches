# LOGICAT HR — Technical Test Context

## Stack (IMPOSED — do not change)
- Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 (sync) + Alembic + Pydantic v2
- DB: PostgreSQL 16 via Docker Compose
- Frontend: React + Vite + TypeScript + React Router v6 + Tailwind + TanStack Query (Day 3+)
- Auth: JWT (PyJWT), password hashing with pwdlib[argon2], 60-min access token, NO refresh tokens
- Tests: pytest + httpx

## Roles
- ADMIN_RH — manages users, attendance, absences, tasks
- EMPLOYEE — manages own attendance, breaks, profile, task status

## Hard constraints — NEVER violate
- No public registration endpoint. Only admins create users.
- No OAuth, no magic links, no email flows, no refresh tokens.
- get_current_user MUST query DB for is_active on every protected request.
- Timestamps: generated server-side only. Never trust client times.
- Timezone: store UTC, compute "today" with Africa/Casablanca.
- All timestamps: datetime.now(timezone.utc).
- Never log passwords or password hashes.
- Pydantic v2 style (model_config), SQLAlchemy 2.0 style (Mapped/mapped_column).

## What NOT to do (common AI over-engineering — reject on sight)
- Do not add refresh tokens or token rotation.
- Do not add a `signup` or `register` endpoint.
- Do not add dark mode, PWA, command palette, or Framer Motion (not until Day 5 buffer).
- Do not add user avatars, file uploads, notifications, or email sending.
- Do not add a `last_login` column unless explicitly asked.
- Do not add a soft-delete column. is_active is the only status flag.
- Do not add an audit log (out of scope).

## Demo accounts (seed must create exactly these)
- admin1@logicat.eu / Admin123!  (ADMIN_RH)
- admin2@logicat.eu / Admin123!  (ADMIN_RH)
- ybadri@logicat.eu / Emp123!  (EMPLOYEE)