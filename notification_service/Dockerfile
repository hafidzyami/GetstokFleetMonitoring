FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE ${PORT_NOTIFCATION_SERVICE:-8081}

# Set non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the application
CMD ["node", "main.js"]