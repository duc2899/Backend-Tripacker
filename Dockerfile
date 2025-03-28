# 🏗 Stage 1: Build Dependencies
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./  
RUN npm ci --omit=dev

COPY . .

# 🚀 Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./  # 🚀 Copy toàn bộ source code từ builder

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "app.js"]
