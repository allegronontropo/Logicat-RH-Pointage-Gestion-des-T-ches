# LOGICAT RH

> HR management application — attendance tracking & task management.
> Technical assessment for LOGICAT GROUP, Maroc.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- Python 3.12+ (for local backend development)
- Node 20+ (for frontend — Day 3+)

---

## Install

```bash
# 1. Clone the repository
git clone <repo-url> logicat-rh
cd logicat-rh

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env — set a strong SECRET_KEY before running in any shared environment

# 3. Start PostgreSQL
docker compose up -d

# 4. Set up the Python virtual environment
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt  # generated during Day 1 foundation session
```

---

## Run

```bash
# From the backend/ directory with .venv active:
uvicorn app.main:app --reload --port 8000
```

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8000/docs` | Swagger UI — full API documentation |
| `http://localhost:8000/api/healthz` | Liveness probe |
| `http://localhost:8000/api/readyz` | Readiness probe (checks DB) |

---

## Demo Accounts

> Credentials are seeded automatically when `SEED_DEMO_DATA=true` (default for local/demo).

| Email | Password | Role |
|-------|----------|------|
| admin1@logicat.eu | Admin123! | Admin RH |
| admin2@logicat.eu | Admin123! | Admin RH |
| ybadri@logicat.eu | Emp123!   | Employee |

> ⚠️ **Never enable `SEED_DEMO_DATA=true` in a production deployment** with these predictable credentials.

---

## Architecture

```
logicat-rh/
├── backend/           # FastAPI + SQLAlchemy 2.0 + Alembic
│   ├── app/
│   │   ├── core/      # config, security, dependencies, permissions
│   │   ├── database/  # engine, session, declarative base
│   │   ├── models/    # SQLAlchemy ORM models (users, employees, attendances, breaks, tasks)
│   │   ├── schemas/   # Pydantic v2 request/response schemas
│   │   ├── routers/   # FastAPI route handlers (thin — HTTP only)
│   │   ├── services/  # Business logic (state machine, calculations, RBAC)
│   │   └── scripts/   # seed.py
│   └── tests/         # pytest + HTTPX
├── frontend/          # React 18 + TypeScript + Vite (Day 3+)
├── docker-compose.yml # PostgreSQL 16-alpine only
└── .env.example       # Local environment template
```

**Two portals:**
- **Admin RH** — desktop-first. Manages users, monitors all attendance, declares absences, full task CRUD.
- **Employee** — mobile-first. Personal check-in/breaks/check-out, own profile (phone + password only), assigned task status updates.

---

## Timezone Convention

All timestamps are **stored in UTC** (`TIMESTAMPTZ` PostgreSQL columns).

"Today" and daily attendance boundaries are computed using the **`Africa/Casablanca`** timezone. This is documented in the codebase wherever `datetime.now(timezone.utc)` and timezone-aware date comparisons appear.

This avoids incorrect attendance assignments around midnight, including during DST transitions.

---

## Running Tests

```bash
# From backend/ with .venv active:
pytest -q
```

Backend tests are in `backend/tests/`. Run `pytest -q` from the `backend/` directory.
