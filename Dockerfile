# /Users/dmitrijsibanov/Desktop/My_projects.nosync/KanBe_2/Dockerfile
FROM node:20-slim

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Ensure data directory exists and is writable
RUN mkdir -p /app/data && chmod -R 777 /app/data

EXPOSE 3000

# Run the server
CMD ["node", "server.js"]
