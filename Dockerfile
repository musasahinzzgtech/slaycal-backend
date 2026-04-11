# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM oven/bun:1.1-alpine AS deps

WORKDIR /app

# Copy only the manifests first to leverage Docker layer caching.
# The lockfile is committed so this layer is stable across code-only changes.
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM oven/bun:1.1-alpine AS release

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove dev-only files that have no place in the image
RUN rm -rf .env .env.* .git

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["bun", "server.js"]
