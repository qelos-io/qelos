FROM node:22.14-slim AS base 
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack install

FROM base AS builder
WORKDIR /build

# Install only the necessary build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-minimal \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and extract the package
COPY qelos-ai.tgz .
# Extract the tarball directly to root with special flags to handle paths with '..' safely
RUN cd /build && tar --absolute-names --no-same-owner --no-same-permissions -xzf qelos-ai.tgz

# Set working directory to the package directory
WORKDIR /build/package

# Install dependencies
RUN npm install --no-frozen-lockfile

# Rebuild Sharp for the current architecture and dynamically install esbuild for the current architecture
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
FROM base
ENV NODE_ENV=production
ENV PORT=9007
EXPOSE $PORT

# Install only runtime dependencies, not build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /

# Copy only the necessary files from the builder stage
COPY --from=builder /build/package /

CMD pnpm start
