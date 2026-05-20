# Stage 1: Build stage (Lightweight Alpine Node)
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency catalogs first to utilize Docker build layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Compile the high-performance production PWA assets
RUN npm run build

# Stage 2: Serve stage (High-performance Alpine Nginx)
FROM nginx:stable-alpine

# Copy custom nginx configuration for SPA routing & PWA caching rules
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
