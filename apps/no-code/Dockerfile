FROM node:20.12-alpine
ENV NODE_ENV=production
ENV PORT=9004
EXPOSE $PORT
COPY qelos-no-code.tgz .
RUN tar zxvf ./qelos-no-code.tgz -C ./
WORKDIR /package
RUN npm i @esbuild/linux-x64
CMD npm start
