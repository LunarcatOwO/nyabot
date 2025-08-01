FROM node:23-alpine

# Install dependencies for music functionality
RUN apk add --no-cache python3 py3-pip ffmpeg git

# Install yt-dlp and spotdl with --break-system-packages to avoid PEP 668 issues
RUN pip3 install --break-system-packages yt-dlp spotdl

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