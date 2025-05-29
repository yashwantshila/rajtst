# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies) for build
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Remove dev dependencies and install only production dependencies
RUN npm prune --production

# Expose the port your app runs on
EXPOSE 8080

# Set the PORT environment variable
ENV PORT=8080
ENV NODE_ENV=production

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application with more verbose logging
CMD ["sh", "-c", "echo 'Starting application...' && npm start"] 