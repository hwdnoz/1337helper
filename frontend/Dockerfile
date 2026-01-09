FROM node:20-bookworm

WORKDIR /app

# for caching
COPY package*.json ./

# dependencies
RUN npm install

# application
COPY . .

# note: gets overridden if docker compose has arg
ARG VITE_API_URL=http://localhost:4102
ARG MODE=dev

# for standalone docker manually write .env
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env
ENV MODE=${MODE}

# need port
EXPOSE 3101

# run dev or prod server based on MODE
CMD ["sh", "-c", "if [ \"$MODE\" = \"prod\" ]; then npm run build && npm run serve -- --host; else npm run dev -- --host; fi"]
