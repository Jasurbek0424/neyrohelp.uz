"""telegram 2fa

Revision ID: 7c2e1a9d4f10
Revises: 3b93613dc5ad
Create Date: 2026-10-10 19:20:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7c2e1a9d4f10"
down_revision: Union[str, Sequence[str], None] = "3b93613dc5ad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_2fa", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "telegram_2fa")
    op.drop_column("users", "telegram_id")
