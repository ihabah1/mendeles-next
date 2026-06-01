FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

# Railway injects PORT; Next.js reads it automatically
CMD ["npm", "start"]
