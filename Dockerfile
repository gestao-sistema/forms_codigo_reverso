# Dockerfile para build e serve (Nginx) do Frontend React + Vite

# 1. Fase de Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json ./

# Instala dependências (incluindo devDependencies para o build)
RUN npm ci

# Define variáveis de ambiente do build passadas via --build-arg pelo Railway
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copia o restante do código e executa o build
COPY . .
RUN npm run build

# 2. Fase de Produção (Nginx)
FROM nginx:alpine

# Remove config default do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os artefatos de build (dist) para a pasta do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Substitui o arquivo default do Nginx com as regras de roteamento (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# O Railway mapeia a porta dinamicamente via ENV PORT,
# mas o Nginx Alpine já escuta na 80 nativamente, e o Railway roteia pro 80 ou pro EXPOSE
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
