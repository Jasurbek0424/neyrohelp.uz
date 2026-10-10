FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
# root emas foydalanuvchi
RUN useradd -r -u 10001 app && mkdir -p /app/media && chown -R app /app/media
USER app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8100
# 2 worker — 4 GB serverda Farm Bot bilan birga yetarli; har biri ~120 MB
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:8100", "--timeout", "30", "--graceful-timeout", "20", "--max-requests", "2000", "--max-requests-jitter", "200"]
