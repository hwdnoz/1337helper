FROM node:20-bookworm-slim

WORKDIR /app

# for caching
COPY package*.json ./

# dependencies
RUN npm install

# application
COPY . .

# Use Docker environment config
COPY .env.docker .env

# Build app (incl. minification and compression)
RUN npm run build

# need port
EXPOSE 3101

# run production server (incl. brotli/gzip support)
CMD ["npm", "run", "serve"]
