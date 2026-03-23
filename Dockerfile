# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first (layer caching)
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose the port your Express app runs on
EXPOSE 5002

# Start the application
CMD ["npm", "start"]