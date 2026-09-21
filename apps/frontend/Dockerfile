# ── 1단계: deps ──
FROM node:22-alpine AS deps
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile

# ── 2단계: builder ──
FROM node:22-alpine AS builder
WORKDIR /app
ENV CI=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable
RUN pnpm run build

# ── 3단계: runner ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]