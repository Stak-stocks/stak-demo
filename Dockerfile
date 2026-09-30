FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
# Email templates (React Email), imported from source by the backend like @stak/shared.
COPY emails/package.json ./emails/
COPY emails/tsconfig.json ./emails/
COPY emails/src/ ./emails/src/
COPY backend/package.json ./backend/
COPY backend/src/ ./backend/src/
COPY backend/tsconfig.json ./backend/
COPY backend/public/ ./backend/public/

RUN npm install --workspace=backend --include=dev

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
