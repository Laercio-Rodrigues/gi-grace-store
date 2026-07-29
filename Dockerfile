# Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de Produção (Servindo com Nginx)
FROM nginx:alpine
# Copia o conteúdo gerado pelo Nitro/TanStack Start (.output/public)
COPY --from=builder /app/.output/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
