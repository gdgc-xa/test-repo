# Campus Compass API — a small Node 24 image that runs as a non-root user.
FROM node:24-alpine

# tzdata so TZ=Asia/Manila works inside Alpine.
RUN apk add --no-cache tzdata

ENV NODE_ENV=production \
    TZ=Asia/Manila \
    PORT=3000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src

# The "node" user comes with the official image.
USER node
EXPOSE 3000

# Docker (and so Traefik) treat the container as healthy only while
# MySQL answers. wget comes with Alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
