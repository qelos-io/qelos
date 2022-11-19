ARG MONOREPO_VERSION=main
FROM qelos/monorepo:${MONOREPO_VERSION} as base
ARG SERVICE_NAME=admin
RUN node tools/bundle-dependencies-polyfix ${SERVICE_NAME}
RUN npm run pack-package --- --scope=@qelos/${SERVICE_NAME}
RUN npm run rename-pack --- --scope=@qelos/${SERVICE_NAME}

FROM node:16.5-alpine
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE $PORT
COPY --from=base /apps/admin/qelos-admin.tgz .
RUN tar zxvf ./qelos-admin.tgz -C ./
WORKDIR /package
CMD npm start
