FROM node:current-alpine

WORKDIR /app

# Copy package files first for npm cache optimization
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production --ignore-optional

# Copy application code
COPY commands/ ./commands/
COPY interactions/ ./interactions/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]