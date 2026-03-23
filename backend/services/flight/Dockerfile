FROM node:22-alpine AS base
WORKDIR /app
# Copy shared adapters first (amadeus.js, sabre.js)
COPY ../../adapters /adapters
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3004
USER node
CMD ["node", "server.js"]
