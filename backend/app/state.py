"""In-memory state for generation jobs.

Jobs live here until the frontend persists them to Prisma.
This is intentionally simple — no DB on the backend side.
"""

GENERATION_JOBS: dict[str, dict] = {}  # keyed by job_id
