ARG MONOREPO_VERSION=main
FROM qelos/monorepo:${MONOREPO_VERSION} as base
ARG SERVICE_NAME=assets
RUN node tools/bundle-dependencies-polyfix ${SERVICE_NAME}
RUN npm run pack-package --- --scope=@qelos/${SERVICE_NAME}
RUN npm run rename-pack --- --scope=@qelos/${SERVICE_NAME}

FROM node:16.5-alpine
ENV PORT=9003
ENV NODE_ENV=production
EXPOSE $PORT
COPY --from=base /apps/assets/qelos-assets.tgz .
RUN tar zxvf ./qelos-assets.tgz -C ./
WORKDIR /package
CMD npm start
