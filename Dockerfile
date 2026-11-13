FROM node:24-bookworm-slim
ARG APP_VERSION=0.1.1
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4340 DATA_DIR=/app/data APP_VERSION=$APP_VERSION
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir -p /app/data && chown -R node:node /app
COPY --chown=node:node src ./src
USER node
EXPOSE 4340
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:4340/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/cli.mjs"]
