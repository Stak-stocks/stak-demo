FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY tsconfig.json ./
COPY public/ ./public/

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
