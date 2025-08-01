FROM node:23-alpine

# Install dependencies for music functionality
RUN apk add --no-cache python3 py3-pip ffmpeg git curl wget

# Install yt-dlp and spotdl with --break-system-packages to avoid PEP 668 issues
# Also update yt-dlp to latest version to help with YouTube bot detection
RUN pip3 install --break-system-packages --upgrade yt-dlp spotdl youtube-dl

# Install additional tools for YouTube extraction
RUN pip3 install --break-system-packages browser-cookie3 keyring

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY commands/ ./commands/
COPY interactions/ ./interactions/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]