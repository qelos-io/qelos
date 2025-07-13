FROM node:20.12-alpine
ENV NODE_ENV=production
ENV PORT=9006
EXPOSE $PORT
COPY qelos-plugins.tgz .
RUN tar zxvf ./qelos-plugins.tgz -C ./
WORKDIR /package
RUN npm i @esbuild/linux-x64
CMD npm start
