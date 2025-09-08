FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9005
EXPOSE $PORT
COPY qelos-drafts.tgz .
RUN mkdir -p /app
RUN tar zxvf ./qelos-drafts.tgz -C /app
WORKDIR /app/package
CMD pnpm start
