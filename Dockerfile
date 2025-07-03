FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY commands/ ./commands/
COPY events/ ./events/
COPY helpers/ ./helpers/
COPY instrument.js ./
COPY index.js ./

ENV ENV=production

CMD ["node", "."]