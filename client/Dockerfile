# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_APP_API is embedded at build time.
# In the Docker setup, nginx proxies /api/* to the backend container,
# so we use the relative /api prefix just like local dev.
ARG VITE_APP_API=/api
ENV VITE_APP_API=$VITE_APP_API

RUN npm run build

# ---- Production stage (serve with nginx) ----
FROM nginx:stable-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
