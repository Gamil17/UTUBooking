# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only copy what Next.js needs to run
COPY --from=builder /app/public       ./public
COPY --from=builder /app/.next/standalone  ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
USER node
CMD ["node", "server.js"]
