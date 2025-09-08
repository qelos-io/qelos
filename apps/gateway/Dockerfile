FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-gateway.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-gateway.tgz -C /app
WORKDIR /app/package
CMD pnpm start
