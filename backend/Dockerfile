FROM python:3.11-slim-bookworm

WORKDIR /app

# for caching
COPY requirements.txt .

# dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# application
COPY . .

# need port
EXPOSE 3102

# run python backend app
CMD ["python", "app.py"]
