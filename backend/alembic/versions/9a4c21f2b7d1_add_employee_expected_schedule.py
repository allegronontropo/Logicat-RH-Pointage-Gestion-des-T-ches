"""add expected schedule to employees

Revision ID: 9a4c21f2b7d1
Revises: 661942d4f1e0
Create Date: 2026-11-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a4c21f2b7d1"
down_revision: Union[str, Sequence[str], None] = "661942d4f1e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("expected_start_time", sa.Time(), nullable=True))
    op.add_column("employees", sa.Column("expected_end_time", sa.Time(), nullable=True))
    op.execute("UPDATE employees SET expected_start_time = '09:00:00' WHERE expected_start_time IS NULL")
    op.execute("UPDATE employees SET expected_end_time = '18:00:00' WHERE expected_end_time IS NULL")
    op.alter_column("employees", "expected_start_time", nullable=False)
    op.alter_column("employees", "expected_end_time", nullable=False)


def downgrade() -> None:
    op.drop_column("employees", "expected_end_time")
    op.drop_column("employees", "expected_start_time")
