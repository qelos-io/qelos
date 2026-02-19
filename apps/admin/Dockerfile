FROM node:22.14-slim
ENV PORT=3001
EXPOSE $PORT
ENV NODE_ENV=production
WORKDIR /app
COPY qelos-admin.tgz /tmp/app.tgz
RUN tar -xzf /tmp/app.tgz -C /app && rm /tmp/app.tgz
CMD ["npm", "start"]
