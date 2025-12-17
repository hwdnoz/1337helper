.PHONY: start

start:
	@bash -c "cd /Users/howard/Code/1337helper && source venv/bin/activate && python app.py 2>&1 &"
	@bash -c "cd /Users/howard/Code/1337helper/frontend && npm run dev 2>&1 &"
