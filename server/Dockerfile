# ---- Base image with Python ----
FROM python:3.13-slim

# ---- Install Poetry (by default lastest version) ----
RUN pip install poetry

# ---- Set working directory ----
WORKDIR /app

# ---- Install dependencies ----
# Copy only dependency files to leverage Docker layer caching
COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-root --only main

# ---- Copy application code ----
COPY . .

# ---- Expose FastAPI port ----
EXPOSE 8000

# ---- Run FastAPI with Uvicorn ----
CMD ["sh", "-c", "poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

