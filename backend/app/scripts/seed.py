"""
backend/app/scripts/seed.py
----------------------------
Idempotent seed script.

Reads SEED_DEMO_DATA from config. If false, exits without seeding.

Creates exactly 3 demo accounts:
  admin1@logicat.ma  / Admin123!   (ADMIN_RH)
  admin2@logicat.ma  / Admin123!   (ADMIN_RH)
  employee1@logicat.ma / Emp123!    (EMPLOYEE — with Employee profile row)

Run:
    SEED_DEMO_DATA=true .\.venv\Scripts\python.exe -m app.scripts.seed
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so `app.*` imports resolve.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.user import User
from app.models.employee import Employee


DEMO_ACCOUNTS = [
    {
        "email": "admin1@logicat.eu",
        "password": "Admin123!",
        "first_name": "Admin",
        "last_name": "One",
        "role": "ADMIN_RH",
        "phone": "+212 600 000 001",
        "employee": None,
    },
    {
        "email": "admin2@logicat.eu",
        "password": "Admin123!",
        "first_name": "Admin",
        "last_name": "Two",
        "role": "ADMIN_RH",
        "phone": "+212 600 000 002",
        "employee": None,
    },
    {
        "email": "ybadri@logicat.eu",
        "password": "Emp123!",
        "first_name": "Youssef",
        "last_name": "Badri",
        "role": "EMPLOYEE",
        "phone": "+212 600 000 003",
        "employee": {
            "department": "IT",
            "position": "Dev",
            "hire_date": None,
        },
    },
    {
        "email": "admin1@logicat.ma",
        "password": "Admin123!",
        "first_name": "Admin",
        "last_name": "One",
        "role": "ADMIN_RH",
        "phone": "+212 600 000 001",
        "employee": None,
    },
    {
        "email": "admin2@logicat.ma",
        "password": "Admin123!",
        "first_name": "Admin",
        "last_name": "Two",
        "role": "ADMIN_RH",
        "phone": "+212 600 000 002",
        "employee": None,
    },
    {
        "email": "employee1@logicat.ma",
        "password": "Emp123!",
        "first_name": "Employee",
        "last_name": "One",
        "role": "EMPLOYEE",
        "phone": "+212 600 000 003",
        "employee": {
            "department": "IT",
            "position": "Dev",
            "hire_date": None,
        },
    },
]


def seed() -> None:
    if not settings.seed_demo_data:
        print("SEED_DEMO_DATA is false — skipping seed.")
        return

    db = SessionLocal()
    try:
        for account in DEMO_ACCOUNTS:
            existing = (
                db.query(User)
                .filter(User.email == account["email"])
                .first()
            )
            if existing:
                print(f"User already exists, skipping: {account['email']}")
                continue

            user = User(
                email=account["email"],
                password_hash=hash_password(account["password"]),
                first_name=account["first_name"],
                last_name=account["last_name"],
                phone=account["phone"],
                role=account["role"],
                is_active=True,
            )
            db.add(user)
            db.flush()  # assign user.id before creating employee profile

            emp_data = account["employee"]
            if emp_data is not None:
                employee = Employee(
                    user_id=user.id,
                    department=emp_data["department"],
                    position=emp_data["position"],
                    hire_date=emp_data["hire_date"],
                )
                db.add(employee)

        db.commit()
        print("Seed complete: demo accounts ensured.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
