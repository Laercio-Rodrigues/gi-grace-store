# Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de Produção (Servindo com Nginx)
FROM nginx:alpine

# Remove qualquer configuração padrão pré-existente
RUN rm -rf /etc/nginx/conf.d/*

# Copia o nosso arquivo nginx.conf personalizado para a pasta de configs do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos gerados pelo build do Nuxt/SPA para a pasta pública do Nginx
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
