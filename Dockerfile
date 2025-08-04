FROM node:current-alpine

# Install only runtime dependencies for music functionality
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./

# Install build dependencies, run npm install, then remove build dependencies in one layer
# This keeps the final image smaller while still allowing native compilation
RUN apk add --no-cache --virtual .build-deps \
    git \
    build-base \
    python3 \
    make \
    && npm ci --only=production --ignore-optional \
    && apk del .build-deps

COPY commands/ ./commands/
COPY interactions/ ./interactions/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]