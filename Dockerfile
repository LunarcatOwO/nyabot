FROM node:23-alpine

# Install dependencies for music functionality and build tools
RUN apk add --no-cache python3 py3-pip ffmpeg git curl wget build-base && \
    pip3 install --break-system-packages --upgrade spotdl && \
    apk del build-base

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