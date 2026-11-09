# Etapa 1: compila la app. Solo esta etapa tiene Node y las dependencias de desarrollo.
FROM node:26-alpine AS build
WORKDIR /app

# Primero solo los archivos de dependencias: mientras no cambien, Docker reutiliza npm ci.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: la imagen final. Solo nginx sin root y los archivos de dist/. Desde nginx 1.30.6 la
# imagen se publica como nginx/nginx-unprivileged; la de nginxinc ya no recibe parches.
FROM nginx/nginx-unprivileged:stable-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
