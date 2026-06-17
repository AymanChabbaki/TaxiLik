# syntax=docker/dockerfile:1
# Multi-stage production image for the TaxiLik API (Express + Socket.IO).

# --- deps: install production node_modules only ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

# Run as non-root.
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# tini for proper signal handling / graceful shutdown.
RUN apk add --no-cache tini wget
USER nodejs

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
