FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run db:generate
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S botuser -u 1001

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm run db:generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && chown -R botuser:nodejs /app

USER botuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD npx prisma db push && node dist/index.js
