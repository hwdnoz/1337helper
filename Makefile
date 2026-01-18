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
	@echo "  make check-dependencies   - Check if Redis and RabbitMQ are running"
	@echo "  make local-start          - Start backend, frontend, and Celery worker (checks dependencies first)"
	@echo "  make local-stop           - Stop local processes"
	@echo "  make test                 - Run unit and integration tests"
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
	@echo "  make compose-reload-celery               - Rebuild and restart celery-worker container only"
	@echo ""
	@echo "Cleanup:"
	@echo "  make docker-remove-containers - Remove Docker containers"
	@echo "  make docker-remove-images     - Remove Docker images"

check-dependencies:
	@echo "Checking dependencies..."
	@test -f .env || (echo "❌ .env file not found. Copy .env.example to .env and configure it." && exit 1)
	@test -n "$(GOOGLE_API_KEY)" || (echo "❌ GOOGLE_API_KEY not set in .env" && exit 1)
	@redis-cli -a "$(REDIS_PASSWORD)" ping > /dev/null 2>&1 || \
	(echo "⚡ Starting Redis with password..." && redis-server --requirepass "$(REDIS_PASSWORD)" --daemonize yes && sleep 1)
	@rabbitmqctl status > /dev/null 2>&1 || (echo "⚡ Starting RabbitMQ..." && brew services start rabbitmq && sleep 5)
	@test -n "$(RABBITMQ_USER)" || (echo "❌ RABBITMQ_USER missing in .env" && exit 1)
	@test -n "$(RABBITMQ_PASS)" || (echo "❌ RABBITMQ_PASS missing in .env" && exit 1)
	@rabbitmqctl list_users | grep -q "^$(RABBITMQ_USER)" || \
	(echo "⚡ Creating RabbitMQ user '$(RABBITMQ_USER)'..." && \
	rabbitmqctl add_user $(RABBITMQ_USER) $(RABBITMQ_PASS) && \
	rabbitmqctl set_permissions -p / $(RABBITMQ_USER) ".*" ".*" ".*" && \
	rabbitmqctl set_user_tags $(RABBITMQ_USER) administrator && \
	echo "✓ RabbitMQ user configured with admin permissions")

local-start: check-dependencies
	@echo "Starting local services..."
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@pkill -f "celery -A celery_app worker" 2>/dev/null || true
	@bash -c "cd backend-python && source ../venv/bin/activate && python app.py 2>&1 &"
	@bash -c "cd frontend && npm run dev 2>&1 &"
	@bash -c "cd backend-python && source ../venv/bin/activate && celery -A celery_app worker --loglevel=info --pool=solo 2>&1 &"
	@echo "✓ Started: Flask backend (port 3102), Frontend (port 3101), Celery worker"

local-stop:
	@echo "Stopping local services..."
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@pkill -f "celery -A celery_app worker" 2>/dev/null || true
	@redis-cli shutdown 2>/dev/null || true
	@brew services stop rabbitmq 2>/dev/null || true
	@echo "✓ Stopped: Flask backend, Frontend, Celery worker, Redis, RabbitMQ"

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

compose-up:
	BACKEND_TYPE=$(BACKEND_TYPE) docker compose up -d --scale backend=$(BACKEND_SCALE)
	@echo "✓ Services started in background. View logs with: docker compose logs -f"

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
