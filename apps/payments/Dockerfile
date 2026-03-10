FROM node:22.14-slim
ENV PORT=9008
EXPOSE $PORT
ENV NODE_ENV=production
WORKDIR /app
COPY qelos-payments.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz
CMD ["npm", "start"]
