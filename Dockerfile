# Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de Produção (Node.js rodando o servidor Nitro)
FROM node:20-alpine
WORKDIR /app

# Copia apenas os artefatos necessários gerados pelo build
COPY --from=builder /app/.output ./output
COPY --from=builder /app/package*.json ./

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

# Comando para iniciar o servidor Node.js
CMD ["node", "output/server/index.mjs"]
