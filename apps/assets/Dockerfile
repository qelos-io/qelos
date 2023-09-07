FROM node:20.6-alpine
ENV PORT=9003
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-assets.tgz .
RUN tar zxvf ./qelos-assets.tgz -C ./
WORKDIR /package
CMD npm start
