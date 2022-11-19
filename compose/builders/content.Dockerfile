ARG MONOREPO_VERSION=main
FROM qelos/monorepo:${MONOREPO_VERSION} as base
ARG SERVICE_NAME=content
RUN node tools/bundle-dependencies-polyfix ${SERVICE_NAME}
RUN npm run pack-package --- --scope=@qelos/${SERVICE_NAME}
RUN npm run rename-pack --- --scope=@qelos/${SERVICE_NAME}

FROM node:16.5-alpine
ENV NODE_ENV=production
ENV PORT=9001
EXPOSE $PORT
COPY --from=base /apps/content/qelos-content.tgz .
RUN tar zxvf ./qelos-content.tgz -C ./
WORKDIR /package
CMD npm start
