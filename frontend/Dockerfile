FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

# Railway injects PORT; Next.js reads it automatically
CMD ["npm", "start"]
