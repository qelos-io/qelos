FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9004
EXPOSE $PORT
COPY qelos-no-code.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-no-code.tgz -C /app
WORKDIR /app/package
RUN pnpm i @esbuild/linux-x64
CMD pnpm start
