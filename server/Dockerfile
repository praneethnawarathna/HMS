# ---- Build stage (install deps, prune dev) ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S hms && adduser -S hms -G hms

# Copy production node_modules from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create directories for uploads and backups (persisted via volumes)
RUN mkdir -p uploads backup && chown -R hms:hms /app

USER hms

EXPOSE 5000

# Use node directly in production (not nodemon)
CMD ["node", "server.js"]
