FROM node:20.12-alpine
ENV PORT=3001
EXPOSE $PORT
ENV NODE_ENV=production
COPY qelos-admin.tgz .
RUN tar zxvf ./qelos-admin.tgz -C ./
WORKDIR /package
CMD npm start
