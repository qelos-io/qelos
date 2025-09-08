FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9002
EXPOSE $PORT
COPY qelos-secrets.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-secrets.tgz -C /app
WORKDIR /app/package
CMD pnpm start
