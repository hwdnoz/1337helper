.PHONY: help local local-stop up down logs docker-stop test

.DEFAULT_GOAL := help

# Load .env file if it exists
-include .env
export

BACKEND_TYPE ?= python
BACKEND_SCALE ?= 1

help:
	@echo "Available commands:"
	@echo ""
	@echo "Local Development:"
	@echo "  make local          - Start backend and frontend locally"
	@echo "  make local-stop     - Stop local processes"
	@echo "  make test           - Run unit and integration tests"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make up             - Start services with docker-compose (detached)"
	@echo "  make down           - Stop and remove docker-compose services"
	@echo "  make logs           - Follow docker-compose logs"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-stop    - Stop individual Docker containers"

local:
	@echo "Checking dependencies..."
	@test -f .env || (echo "❌  .env file not found." && exit 1)
	@test -n "$(GOOGLE_API_KEY)" || (echo "❌  GOOGLE_API_KEY not set in .env" && exit 1)
	@echo "Starting local services..."
	@cd backend-python && ./venv/bin/python3 app.py & \
	 cd frontend && npm run dev

local-stop:
	@echo "Stopping local services..."
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@pkill -f "python3 app.py" 2>/dev/null || true
	@echo "✓ Stopped: Flask backend and Frontend"

up:
	@docker compose up -d

down:
	@docker compose down

logs:
	@docker compose logs -f


docker-stop:
	@docker stop 1337helper-backend 2>/dev/null || true
	@docker stop 1337helper-frontend 2>/dev/null || true

test:
	@echo "Running pytest unit tests..."
	@cd backend-python && source ../venv/bin/activate && pytest tests/test_api.py -v
	@echo ""
	@echo "Running integration tests..."
	@./backend-python/tests/test_api.sh http://localhost:3102
