.PHONY: local-start local-stop docker-frontend docker-backend docker-stop

local-start:
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true
	@bash -c "cd /Users/howard/Code/1337helper && source venv/bin/activate && python app.py 2>&1 &"
	@bash -c "cd /Users/howard/Code/1337helper/frontend && npm run dev 2>&1 &"

local-stop:
	@echo "Stopping whatever lives on ports 3102 and 3101..."
	@lsof -ti :3102 | xargs kill 2>/dev/null || true
	@lsof -ti :3101 | xargs kill 2>/dev/null || true

docker-frontend:
	@docker build -t 1337helper-frontend ./frontend
	@docker run -p 4101:3101 1337helper-frontend

docker-backend:
	@docker build -t 1337helper-backend .
	@docker run -p 4102:3102 -e GOOGLE_API_KEY=$$(grep GOOGLE_API_KEY .env | cut -d '=' -f2) 1337helper-backend

