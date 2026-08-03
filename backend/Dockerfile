# Etapa 1: compila el panel admin (React + Vite)
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Etapa 2: backend + el build del frontend ya compilado
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY --from=frontend-build /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
