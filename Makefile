.PHONY: help check-dependencies local-start local-stop local-clear docker-frontend docker-backend docker-start docker-stop docker-logs-backend docker-logs-frontend docker-remove-containers docker-remove-images compose-up compose-down compose-clear compose-reload-frontend test benchmark

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
	@echo "  make local-start          - Start backend and frontend"
	@echo "  make local-stop           - Stop local processes"
	@echo "  make test                 - Run unit and integration tests"
	@echo ""
	@echo "Docker (Individual Containers):"
	@echo "  make docker-backend       - Build and start backend container"
	@echo "  make docker-frontend      - Build and start frontend container"
	@echo "  make docker-start         - Start both containers"
	@echo "  make docker-stop          - Stop both containers"
	@echo "  make docker-logs-backend  - Follow backend logs"
	@echo "  make docker-logs-frontend - Follow frontend logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make docker-remove-containers - Remove Docker containers"
	@echo "  make docker-remove-images     - Remove Docker images"

local-start:
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

docker-backend:
	@docker build -t 1337helper-backend .
	@docker start 1337helper-backend 2>/dev/null || docker run -d --name 1337helper-backend -p 4102:3102 -e GOOGLE_API_KEY=$$(grep GOOGLE_API_KEY .env | cut -d '=' -f2) 1337helper-backend

docker-frontend:
	@docker build -t 1337helper-frontend ./frontend
	@docker start 1337helper-frontend 2>/dev/null || docker run -d --name 1337helper-frontend -p 4101:3101 1337helper-frontend

docker-start: docker-backend docker-frontend
	@docker logs --tail 20 1337helper-backend
	@docker logs --tail 20 1337helper-frontend

docker-logs:
	@docker compose logs -f


docker-stop:
	@docker stop 1337helper-backend 2>/dev/null || true
	@docker stop 1337helper-frontend 2>/dev/null || true

docker-remove-containers:
	@docker rm -f 1337helper-backend 2>/dev/null || true
	@docker rm -f 1337helper-frontend 2>/dev/null || true

docker-remove-images:
	@docker rmi -f 1337helper-backend 2>/dev/null || true
	@docker rmi -f 1337helper-frontend 2>/dev/null || true

test:
	@echo "Running pytest unit tests..."
	@cd backend-python && source ../venv/bin/activate && pytest tests/test_api.py -v
	@echo ""
	@echo "Running integration tests..."
	@./backend-python/tests/test_api.sh http://localhost:3102
