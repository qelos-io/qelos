FROM node:22.14-slim
ENV PORT=9006
ENV NODE_JQ_PATH="/usr/bin/jq"
EXPOSE $PORT
ENV NODE_ENV=production

# Install required system packages (curl for node-jq postinstall, jq as fallback runtime)
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl jq \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY qelos-plugins.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz
RUN npm rebuild node-jq
CMD ["npm", "start"]
