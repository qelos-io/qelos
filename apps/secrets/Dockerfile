FROM node:20.6-alpine
ENV NODE_ENV=production
ENV PORT=9002
EXPOSE $PORT
COPY qelos-secrets.tgz .
RUN tar zxvf ./qelos-secrets.tgz -C ./
WORKDIR /package
CMD npm start
