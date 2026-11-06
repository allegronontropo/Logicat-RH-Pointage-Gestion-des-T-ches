# TESTS.md — LOGICAT RH Test Matrix

All backend tests live in `backend/tests/`. Run with: `pytest -q`

## T1–T14 (from PROJECT_PLAN.md §11.1)

| ID  | Scenario | Input | Expected |
|-----|----------|-------|----------|
| T1  | Employee calls admin endpoint | Employee token → `GET /api/users` | 403 |
| T2  | Employee accesses another employee's task | Employee A token → `GET /api/tasks/{B_task_id}` | 403 or 404 |
| T3  | Employee attempts to modify task content via status endpoint | `PATCH /api/tasks/{id}/status` with `title` in body | Extra field ignored or 422 |
| T4  | Employee attempts to modify historical attendance | Any mutation on a past attendance record | 403 |
| T5  | Deactivated account uses a valid JWT | Deactivated user → any protected endpoint | 401 |
| T6  | Double check-in same day | 2× `POST /api/attendances/check-in` same day | 409 |
| T7  | Two breaks simultaneously | Start break 2 without ending break 1 | 409 |
| T8  | Check-out during active break | `POST /api/attendances/check-out` while break has no `end_time` | 409 |
| T9  | Same break type twice in one day | 2× `POST /api/breaks/start` with type=LUNCH | 409 |
| T10 | Admin self-deactivation | Admin → `PATCH /api/users/{own_id}/deactivate` | 403 |
| T11 | Admin deactivates the last active ADMIN_RH | `PATCH /api/users/{id}/deactivate` when only 1 admin remains | 409 |
| T12 | Employee attempts to change own role | `PATCH /api/employees/me/profile` with `role` field | Field rejected (422) or ignored |
| T13 | Working time calculation (canonical example from cahier) | check-in 09:00, check-out 18:00, breaks 15+60+15 min | presence=9h, breaks=1h30, effective=7h30 |
| T14 | Duplicate email on user creation | `POST /api/users` with an already-used email | 409 or 422 |

## T15–T18 (Additional edge cases)

| ID  | Scenario | Input | Expected |
|-----|----------|-------|----------|
| T15 | Employee attempts attendance action before check-in | `POST /api/breaks/start` with no prior check-in today | 409 |
| T16 | Malformed or tampered JWT | Request with `Authorization: Bearer <corrupted_token>` | 401 |
| T17 | IDOR — Employee reads another employee's attendance by ID | `GET /api/attendances/{other_employee_attendance_id}` | 403 or 404 |
| T18 | Admin attempts to update a task's status via the employee-only status endpoint | Admin token → `PATCH /api/tasks/{id}/status` | 403 |
