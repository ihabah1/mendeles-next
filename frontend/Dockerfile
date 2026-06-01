FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN npx prisma generate
RUN npx next build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
