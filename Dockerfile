# Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de Produção (Servindo com Nginx)
FROM nginx:alpine

# Remove qualquer arquivo padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*
RUN rm -rf /etc/nginx/conf.d/*

# Copia o nosso arquivo nginx.conf personalizado
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do Nuxt para o diretório web do Nginx
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
