# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Next.js đánh giá rewrites() lúc build → cần biết URL backend khi build.
# Trong compose, service backend tên là "backend".
ARG BACKEND_INTERNAL_URL=http://backend:3001
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Bản standalone: server.js + node_modules tối thiểu.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
