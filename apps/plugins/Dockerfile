FROM node:22.14-slim AS builder
WORKDIR /build

# Install only the necessary build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-minimal \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and extract the package
COPY qelos-plugins.tgz .
RUN tar zxvf ./qelos-plugins.tgz -C ./
WORKDIR /build/package

# Rebuild Sharp for the current architecture and dynamically install esbuild for the current architecture
RUN npm rebuild sharp && \
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
ENV NODE_ENV=production
ENV PORT=9006
EXPOSE $PORT

# Install only runtime dependencies, not build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /build/package /app

CMD npm start
