FROM node:20.12-alpine
ENV PORT=9000
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-auth.tgz .
RUN tar zxvf ./qelos-auth.tgz -C ./
WORKDIR /package
CMD npm start
