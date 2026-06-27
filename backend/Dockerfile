# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Không tải Chromium kèm puppeteer (dùng Chromium hệ thống ở runtime).
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Loại bỏ devDependencies để runtime gọn hơn.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium + thư viện cần thiết cho Puppeteer (render PDF).
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     chromium fonts-liberation libnss3 libatk1.0-0 libatk-bridge2.0-0 \
     libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
     libgbm1 libasound2 libpango-1.0-0 libcairo2 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3004
ENTRYPOINT ["./docker-entrypoint.sh"]
