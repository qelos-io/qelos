FROM node:22.14-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV PORT=9000
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-auth.tgz .
RUN tar zxvf ./qelos-auth.tgz -C ./
WORKDIR /package
CMD pnpm start
