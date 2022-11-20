FROM node:16.15-alpine
ENV PORT=3002
ENV NODE_ENV=production
EXPOSE $PORT
COPY qelos-front-ssr.tgz .
RUN tar zxvf ./qelos-front-ssr.tgz -C ./

WORKDIR /package
COPY *.mjs *.json *.js /package/
RUN npm install
COPY client /package/client
CMD npm start
