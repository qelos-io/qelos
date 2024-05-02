FROM node:20.12-alpine
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-gateway.tgz .
RUN tar zxvf ./qelos-gateway.tgz -C ./
WORKDIR /package
CMD npm start
