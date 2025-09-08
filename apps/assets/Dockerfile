FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV PORT=9003
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-assets.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-assets.tgz -C /app
WORKDIR /package
CMD pnpm start
