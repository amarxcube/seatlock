# syntax=docker/dockerfile:1.7
# One image for the API and the worker (architecture §3); the worker overrides the command:
#   API:    node dist/main.js     (default)
#   Worker: node dist/worker.js
ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-slim AS base
# openssl is needed by Prisma's schema engine (migrations run from this image before deploys).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

# Behind a TLS-intercepting proxy, mount a PEM bundle containing the proxy's CA and point Node
# at it (the file path is on your machine, outside the repo):
#   podman build -v <path-to-ca-bundle.pem>:/certs/extra-ca.pem:ro \
#     --build-arg NODE_EXTRA_CA_CERTS=/certs/extra-ca.pem .
# Unset (CI, Render) it has no effect. It is only used while building, never in the final image.

# Keep only the API and the workspace packages it depends on (ADR-0002).
FROM base AS pruner
ARG NODE_EXTRA_CA_CERTS
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @seatlock/api --docker

FROM base AS builder
ARG NODE_EXTRA_CA_CERTS
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# The API serves the committed contract at /api/docs; it lives outside the pruned workspace.
COPY docs/api/openapi.yaml docs/api/openapi.yaml
RUN pnpm turbo run build --filter=@seatlock/api
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm --filter @seatlock/api deploy --prod --legacy /out
# Bundle Prisma's schema engine so the pre-deploy `prisma migrate deploy` never downloads it.
# (Running any engine-backed command fetches it; this one needs no database.)
RUN cd /out && node_modules/.bin/prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /dev/null

FROM node:${NODE_VERSION}-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /out .
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
