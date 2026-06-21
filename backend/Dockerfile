FROM node:20-alpine

WORKDIR /app

# Copy workspace root config
COPY package.json package-lock.json ./

# Copy shared package source (resolved as @stak/shared via workspaces)
COPY shared/ ./shared/

# Copy backend source
COPY backend/package.json ./backend/
COPY backend/src/ ./backend/src/
COPY backend/tsconfig.json ./backend/
COPY backend/public/ ./backend/public/

# Install backend deps (workspace link to shared is set up automatically)
RUN npm install --workspace=backend --omit=dev

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
