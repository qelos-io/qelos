FROM node:22.14-slim AS builder
ENV PORT=3001
EXPOSE $PORT
ENV NODE_ENV=production
COPY qelos-admin.tgz .
RUN tar zxvf ./qelos-admin.tgz -C ./
WORKDIR /package
CMD npm start
