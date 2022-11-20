FROM node:16.5-alpine
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE $PORT
COPY ../../compose/builders .
WORKDIR /package
CMD npm start
