FROM node:22.14-slim AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-minimal \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm install @esbuild/linux-x64 --no-save

COPY qelos-ai.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz

# Rebuild Sharp for the current architecture (esbuild is already installed by pnpm deploy on Linux CI)
RUN npm install -g prebuild-install && npm rebuild sharp

# Production image
FROM node:22.14-slim
ENV PORT=9007
EXPOSE $PORT
ENV NODE_ENV=production

# Install only runtime dependencies, not build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app /app
CMD ["npm", "start"]
