FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9006
EXPOSE $PORT
COPY qelos-plugins.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-plugins.tgz -C /app
WORKDIR /app/package
CMD pnpm start
