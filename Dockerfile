# Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de Produção (Servindo com Nginx)
FROM nginx:alpine

# Remove o site padrão do nginx para evitar conflitos
RUN rm -rf /etc/nginx/conf.d/*

# Copia os arquivos gerados pelo build para a pasta do Nginx
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Cria o arquivo de configuração correto do Nginx
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
