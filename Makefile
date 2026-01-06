.PHONY: help local-start local-stop docker-frontend docker-backend docker-start docker-stop docker-logs-backend docker-logs-frontend docker-remove-containers docker-remove-images compose-up compose-down compose-clear compose-reload-frontend test benchmark

.DEFAULT_GOAL := help

BACKEND_TYPE ?= python
BACKEND_SCALE ?= 1

help:
	@echo "Available commands:"
	@echo ""
	@echo "Local Development:"
	@echo "  make local-start          - Start backend and frontend locally"
	@echo "  make local-stop           - Stop local processes"
	@echo "  make test                 - Run integration tests against API"
	@echo "  make benchmark            - Run RAG benchmark (saves to backend-python/benchmark_results/)"
	@echo ""
	@echo "Docker (Individual Containers):"
	@echo "  make docker-backend       - Build and start backend container"
	@echo "  make docker-frontend      - Build and start frontend container"
	@echo "  make docker-start         - Start both containers"
	@echo "  make docker-stop          - Stop both containers"
	@echo "  make docker-logs-backend  - Follow backend logs"
	@echo "  make docker-logs-frontend - Follow frontend logs"
	@echo ""
	@echo "Docker Compose (Recommended):"
	@echo "  make compose-up                          - Start all services (Python backend)"
	@echo "  make compose-up BACKEND_TYPE=node        - Start with Node.js backend"
	@echo "  make compose-up BACKEND_SCALE=5          - Start with 5 Python backend instances"
	@echo "  make compose-up BACKEND_TYPE=node BACKEND_SCALE=3  - 3 Node.js instances"
	@echo "  make compose-down                        - Stop and remove all containers"
	@echo "  make compose-clear                       - Stop containers and prune Docker system"
	@echo "  make compose-reload-frontend             - Rebuild and restart frontend container only"
	@echo ""
	@echo "Cleanup:"
	@echo "  make docker-remove-containers - Remove Docker containers"
	@echo "  make docker-remove-images     - Remove Docker images"

local-start:
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@bash -c "cd /Users/howard/Code/1337helper/backend-python && source ../venv/bin/activate && python app.py 2>&1 &"
	@bash -c "cd /Users/howard/Code/1337helper/frontend && npm run dev 2>&1 &"

local-stop:
	@echo "Stopping whatever lives on ports 3102 and 3101..."
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true

docker-backend:
	@docker build -t 1337helper-backend .
	@docker start 1337helper-backend 2>/dev/null || docker run -d --name 1337helper-backend -p 4102:3102 -e GOOGLE_API_KEY=$$(grep GOOGLE_API_KEY .env | cut -d '=' -f2) 1337helper-backend

docker-frontend:
	@docker build -t 1337helper-frontend ./frontend
	@docker start 1337helper-frontend 2>/dev/null || docker run -d --name 1337helper-frontend -p 4101:3101 1337helper-frontend

docker-start: docker-backend docker-frontend
	@docker logs --tail 20 1337helper-backend
	@docker logs --tail 20 1337helper-frontend
	@echo "Containers started. Use 'make docker-logs-backend' or 'make docker-logs-frontend' to follow logs"
	@echo "Containers running in background..."

docker-logs-backend:
	@docker logs -f 1337helper-backend

docker-logs-frontend:
	@docker logs -f 1337helper-frontend

docker-stop:
	@docker stop 1337helper-backend 2>/dev/null || true
	@docker stop 1337helper-frontend 2>/dev/null || true

docker-remove-containers:
	@docker rm -f 1337helper-backend 2>/dev/null || true
	@docker rm -f 1337helper-frontend 2>/dev/null || true

docker-remove-images:
	@docker rmi -f 1337helper-backend 2>/dev/null || true
	@docker rmi -f 1337helper-frontend 2>/dev/null || true

compose-up:
	BACKEND_TYPE=$(BACKEND_TYPE) docker compose up --scale backend=$(BACKEND_SCALE)

compose-down:
	@docker compose down

compose-clear:
	@docker compose down
	@docker system prune -af
	@docker buildx prune -af

compose-reload-frontend:
	docker-compose up -d --build frontend

compose-reload-celery:
	docker-compose up -d --build celery-worker

test:
	@echo "Running pytest unit tests..."
	@cd backend-python && source ../venv/bin/activate && pytest tests/test_api.py -v
	@echo ""
	@echo "Running integration tests..."
	@./backend-python/tests/test_api.sh http://localhost:5102

benchmark:
	@echo "Running RAG benchmark in celery-worker container..."
	@docker-compose exec celery-worker python benchmark_rag.py
	@echo ""
	@echo "Benchmark complete! Results saved to data/benchmark_results/"
	@echo "Latest result:"
	@ls -lht data/benchmark_results/ | head -n 2 | tail -n 1

# use below with care; uncoment to use;
# will stop and remove all containers, images, and volumes including those unrelated to this application

# docker-prune:
# 	@docker system prune -a
# docker-remove-volumes:
# 	@docker volume prune -f