FROM node:22-alpine AS base
WORKDIR /app
COPY ../../adapters /adapters
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3005
USER node
CMD ["node", "server.js"]
