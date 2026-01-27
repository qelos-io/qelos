FROM node:22.14-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9006
ENV NODE_JQ_PATH="/usr/bin/jq"
EXPOSE $PORT

# Copy the tarball
COPY qelos-plugins.tgz /

# Extract the tarball directly to root with special flags to handle paths with '..' safely
RUN cd / && tar --absolute-names --no-same-owner --no-same-permissions -xzf qelos-plugins.tgz

# Set working directory to the package directory
WORKDIR /package

# Install required system packages (curl for node-jq postinstall, jq as fallback runtime)
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl jq \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies (excluding @qelos packages which are bundled)
# Backup bundled @qelos dependencies
RUN mv node_modules/@qelos /tmp/qelos-backup || true
# Install remaining dependencies
RUN pnpm install --no-frozen-lockfile
# Restore bundled dependencies
RUN mv /tmp/qelos-backup node_modules/@qelos || true
# Rebuild node-jq if needed
RUN npm rebuild node-jq

# Start the application
CMD ["pnpm", "start"]
