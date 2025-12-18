FROM python:3.11-slim

WORKDIR /app

# for caching
COPY requirements.txt .

# dependencies
RUN pip install --no-cache-dir -r requirements.txt

# application
COPY . .

# need port
EXPOSE 3102

# run python backend app
CMD ["python", "app.py"]
