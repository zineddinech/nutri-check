# Backend - FastAPI + Poetry

This backend API is the analytical engine for the "Public Services Location and Socio-Economic Analysis" project. Developed with **FastAPI**, using **Poetry** for dependency management and containerized with **Docker**, it provides essential geospatial processing and socio-economic analysis services.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py         # FastAPI entry point
│   ├── api/            # API routes
│   ├── core/           # Config and settings
│   ├── database/       # DB session & models
│   ├── models/         # SQLAlchemy models
│   ├── schemas/        # Pydantic schemas
│   └── services/       # Business logic
├── tests/              # Unit & integration tests
├── pyproject.toml      # Poetry dependency config
├── Dockerfile          # Docker instructions
├── .dockerignore       # Docker ignore file
└── README.md
```

---

## Getting Started

### Run locally

1. **Install Poetry**
```bash
pip install poetry
```

2. **Install dependencies**
```bash
poetry install
```

3. **Run the server**
```bash
poetry run uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

4. **Execute the tests**
```bash
poetry run pytest
```

### Run with Docker

1. **Build the image**
```bash
docker build -t nutri-check-server .
```

2. **Run the container**
```bash
docker run -p 8000:8000 nutri-check-server
```

Or use the existing `docker-compose.yml` at project root:
```bash
docker compose up --build
```

## Code Quality

We use the following tools for code formatting and static analysis:
* `black` – code formatter
* `isort` – import sorter
* `mypy` – type checker

### Run static checks

```bash
poetry run black .
poetry run isort .
poetry run mypy app/
```

## Dev Containers (VS Code)

This project supports Dev Containers for isolated development.

### Setup

1. Open the project in VS Code
2. Make sure Docker is running
3. Install the "Remote - Containers" extension
4. Run `Dev Containers: Reopen in Container` from command palette

The dev container is configured to:
* Install Python + Poetry
* Mount the backend code
* Optionally install frontend dependencies if needed



---

