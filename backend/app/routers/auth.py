"""
app/routers/auth.py
--------------------
Authentication router — stub for Day 1 foundation session.

Endpoints to implement (Day 1):
  POST /api/auth/login   — email + password → JWT access token
  GET  /api/auth/me      — returns the current authenticated user
  POST /api/auth/logout  — client-side only; server acknowledges

Do NOT add any logic here until the Day 1 foundation session.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])

# TODO (Day 1 foundation session): POST /login, GET /me, POST /logout
