FROM node:current-alpine

# Install dependencies for music functionality and build tools
RUN apk add --no-cache python3 py3-pip ffmpeg git build-base

# Install SpotDL and YT-DLP separately with longer timeout and better error handling
RUN pip3 install --break-system-packages --upgrade --timeout 300 yt-dlp && \
    pip3 install --break-system-packages --upgrade --timeout 300 spotdl || \
    (echo "SpotDL installation failed, retrying..." && sleep 5 && pip3 install --break-system-packages --upgrade --timeout 300 spotdl)

# Clean up build dependencies and create temp directory
RUN apk del build-base && \
    mkdir -p /tmp/nyabot-music

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --ignore-optional || npm install --only=production --ignore-optional

COPY commands/ ./commands/
COPY interactions/ ./interactions/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]