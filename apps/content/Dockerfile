FROM node:20.6-alpine
ENV NODE_ENV=production
ENV PORT=9001
EXPOSE $PORT
COPY qelos-content.tgz .
RUN tar zxvf ./qelos-content.tgz -C ./
WORKDIR /package
CMD npm start
