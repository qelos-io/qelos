FROM node:22.14-slim AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-minimal \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY qelos-ai.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz

# Rebuild Sharp for the current architecture and install esbuild for the target platform
RUN npm install -g prebuild-install && \
    npm rebuild sharp && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      npm install @esbuild/linux-x64 --no-save; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      npm install @esbuild/linux-arm64 --no-save; \
    else \
      echo "Unsupported architecture: $ARCH"; \
      exit 1; \
    fi

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
