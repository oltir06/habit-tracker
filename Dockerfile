FROM node:18-alpine

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies strictly from lockfile
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Set correct permissions strictly for the node user
RUN chown -R node:node /app

# Expose port (non-root users can bind ports > 1024)
EXPOSE 3000

# Switch to non-root user for security
USER node

# Start the app
CMD ["node", "app.js"]