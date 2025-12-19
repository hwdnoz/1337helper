.PHONY: help local-start local-stop docker-frontend docker-backend docker-start docker-stop docker-logs-backend docker-logs-frontend docker-remove-containers docker-remove-images compose-up compose-down

.DEFAULT_GOAL := help

BACKEND_SCALE ?= 1

help:
	@echo "Available commands:"
	@echo ""
	@echo "Local Development:"
	@echo "  make local-start          - Start backend and frontend locally"
	@echo "  make local-stop           - Stop local processes"
	@echo ""
	@echo "Docker (Individual Containers):"
	@echo "  make docker-backend       - Build and start backend container"
	@echo "  make docker-frontend      - Build and start frontend container"
	@echo "  make docker-start         - Start both containers"
	@echo "  make docker-stop          - Stop both containers"
	@echo "  make docker-logs-backend  - Follow backend logs"
	@echo "  make docker-logs-frontend - Follow frontend logs"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make compose-up                   - Start services (default: BACKEND_SCALE=1)"
	@echo "  make compose-up BACKEND_SCALE=3   - Start with 3 backend instances + nginx"
	@echo "  make compose-down                 - Stop and remove containers"
	@echo ""
	@echo "Cleanup:"
	@echo "  make docker-remove-containers - Remove Docker containers"
	@echo "  make docker-remove-images     - Remove Docker images"

local-start:
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@bash -c "cd /Users/howard/Code/1337helper && source venv/bin/activate && python app.py 2>&1 &"
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
	@docker-compose up --scale backend=$(BACKEND_SCALE)

compose-down:
	@docker-compose down

# use below with care; uncoment to use;
# will stop and remove all containers, images, and volumes including those unrelated to this application

# docker-prune:
# 	@docker system prune -a
# docker-remove-volumes:
# 	@docker volume prune -f
