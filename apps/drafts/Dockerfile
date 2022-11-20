FROM node:16.5-alpine
ENV NODE_ENV=production
ENV PORT=9005
EXPOSE $PORT
COPY qelos-drafts.tgz .
RUN tar zxvf ./qelos-drafts.tgz -C ./
WORKDIR /package
CMD npm start
