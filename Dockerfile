FROM node:current-alpine

# Install runtime dependencies first (cached layer)
RUN apk add --no-cache ffmpeg

# Install build dependencies (cached layer)
RUN apk add --no-cache --virtual .build-deps \
    git \
    build-base \
    python3 \
    make

WORKDIR /app

# Copy package files first for npm cache optimization
COPY package*.json ./

# Install npm dependencies (benefits from both npm cache and Docker layer cache)
RUN npm ci --only=production --ignore-optional

# Remove build dependencies (keep image small)
RUN apk del .build-deps

# Copy application code last (changes most frequently)
COPY commands/ ./commands/
COPY interactions/ ./interactions/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]