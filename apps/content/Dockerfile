FROM node:26.12-slim
ENV PORT=9001
EXPOSE $PORT
ENV NODE_ENV=production
WORKDIR /app
COPY qelos-content.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz
CMD ["npm", "start"]
