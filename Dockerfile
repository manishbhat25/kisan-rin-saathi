# Production image for the portal using PostgreSQL.
# NOTE: written for docker compose; not yet built or run on the development machine (Docker was not installed).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN node scripts/make-pg-schema.mjs \
  && npx prisma generate --schema prisma/postgres/schema.prisma \
  && npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 1001 portal \
  && mkdir -p /data/uploads && chown -R portal /data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
  UPLOAD_DIR=/data/uploads MODEL_DIR=/app/ml/artifacts
COPY --from=build --chown=portal /app/.next/standalone ./
COPY --from=build --chown=portal /app/.next/static ./.next/static
COPY --from=build --chown=portal /app/ml/artifacts ./ml/artifacts
COPY --from=build --chown=portal /app/prisma/postgres ./prisma/postgres
COPY --from=build --chown=portal /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=portal /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=portal /app/node_modules/.prisma ./node_modules/.prisma
USER portal
EXPOSE 3000
VOLUME ["/data/uploads"]
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema prisma/postgres/schema.prisma && node server.js"]
