ARG MONOREPO_VERSION=main
FROM qelos/monorepo:${MONOREPO_VERSION} as base
ARG SERVICE_NAME=drafts
RUN node tools/bundle-dependencies-polyfix ${SERVICE_NAME}
RUN npm run pack-package --- --scope=@qelos/${SERVICE_NAME}
RUN npm run rename-pack --- --scope=@qelos/${SERVICE_NAME}

FROM node:16.5-alpine
ENV NODE_ENV=production
ENV PORT=9005
EXPOSE $PORT
COPY --from=base /apps/drafts/qelos-drafts.tgz .
RUN tar zxvf ./qelos-drafts.tgz -C ./
WORKDIR /package
CMD npm start
