FROM node:20.12-alpine
ENV NODE_ENV=production
ENV PORT=9006
EXPOSE $PORT
COPY qelos-plugins.tgz .
RUN tar zxvf ./qelos-no-code.tgz -C ./
WORKDIR /package
CMD npm start
