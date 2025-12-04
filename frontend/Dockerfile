FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
# исходники монтируем томом
EXPOSE 5173
