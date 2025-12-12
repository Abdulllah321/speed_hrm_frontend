# Stage 1: Dependencies (Bun for speed)
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Build (Bun)
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Stage 3: Production (Bun)
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=bunjs:bunjs /app/.next/standalone ./
COPY --from=builder --chown=bunjs:bunjs /app/.next/static ./.next/static

USER bunjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]

