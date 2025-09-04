FROM node:22.14
COPY . .
ENV NODE_ENV=development
RUN pnpm install --unsafe-perm
RUN pnpm run build

RUN pnpm run clean
ENV NODE_ENV=production
RUN pnpm run install:prod-only
