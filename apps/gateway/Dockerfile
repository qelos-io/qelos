FROM node:16.5-alpine
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-gateway.tgz .
RUN tar zxvf ./qelos-gateway.tgz -C ./
WORKDIR /package
CMD npm start
