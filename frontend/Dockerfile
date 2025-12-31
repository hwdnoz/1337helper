FROM node:20-bookworm-slim

WORKDIR /app

# need curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# for caching
COPY package*.json ./

# dependencies
RUN npm install

# application
COPY . .

# note: gets overridden if docker compose has arg
ARG VITE_API_URL=http://localhost:4102

# for standalone docker manually write .env
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env

# Build app (incl. minification and compression)
RUN npm run build

# need port
EXPOSE 3101

# run production server (incl. brotli/gzip support)
CMD ["npm", "run", "serve"]
