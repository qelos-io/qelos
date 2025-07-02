FROM node:20.12-alpine
ENV NODE_ENV=production
ENV PORT=9004
EXPOSE $PORT
RUN npm i @esbuild/linux-x64
COPY qelos-no-code.tgz .
RUN tar zxvf ./qelos-no-code.tgz -C ./
WORKDIR /package
CMD npm start
