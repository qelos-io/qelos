FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV PORT=3001
EXPOSE $PORT
ENV NODE_ENV=production
COPY qelos-admin.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-admin.tgz -C /app
WORKDIR /app/package
CMD pnpm start
