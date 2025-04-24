FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY app/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY app/backend ./backend
COPY app/frontend ./frontend

# Create directory for SQLite database
RUN mkdir -p /app/backend/database

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "backend/server.js"] 