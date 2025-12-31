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

# need port
EXPOSE 3101

# run dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
