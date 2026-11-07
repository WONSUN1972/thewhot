FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN DATABASE_URL=postgresql://unused:unused@localhost/build_only STORE_CORS=http://localhost ADMIN_CORS=http://localhost AUTH_CORS=http://localhost JWT_SECRET=build_only_placeholder_not_for_runtime_123 COOKIE_SECRET=build_only_placeholder_not_for_runtime_456 npm run build
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.medusa/server ./
RUN mkdir -p /app/static && chown node:node /app/static
USER node
EXPOSE 9000
CMD ["node","node_modules/@medusajs/cli/cli.js","start","--host","0.0.0.0","--port","9000"]
