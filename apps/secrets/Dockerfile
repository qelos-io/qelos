FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9002
EXPOSE $PORT
COPY qelos-secrets.tgz .
RUN tar zxvf ./qelos-secrets.tgz -C ./
WORKDIR /package
CMD pnpm start
