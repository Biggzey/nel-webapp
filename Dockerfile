# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your code
COPY . .

# Build the frontend
RUN npm run build

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start the server
CMD ["node", "server.js"] 