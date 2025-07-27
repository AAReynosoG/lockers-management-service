FROM node:22.16.0-alpine3.22 AS base

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build

# Production stage
FROM base
WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app
COPY config/passport/oauth-public.key /app/config/passport/oauth-public.key
COPY config/mysql-certs/ /app/config/mysql-certs/
COPY config/mongo-certs/ /app/config/mongo-certs/
COPY resources/views/ /app/resources/views/
EXPOSE 8003
CMD ["node", "./bin/server.js"]
