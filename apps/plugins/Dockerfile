FROM node:22.14-slim AS builder
ENV NODE_ENV=production
ENV PORT=9006
EXPOSE $PORT
COPY qelos-plugins.tgz .
RUN tar zxvf ./qelos-plugins.tgz -C ./
WORKDIR /package
CMD npm start
