FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9004
EXPOSE $PORT
COPY qelos-no-code.tgz .
# Extract the tarball directly to root with special flags to handle paths with '..' safely
RUN cd / && tar --absolute-names --no-same-owner --no-same-permissions -xzf qelos-no-code.tgz

# Set working directory to the package directory
WORKDIR /package

# Install required system packages for dependency postinstall scripts
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

#install jq
RUN apt-get install -y jq

# Install dependencies
RUN pnpm install --no-frozen-lockfile
RUN pnpm i @esbuild/linux-x64
CMD pnpm start
