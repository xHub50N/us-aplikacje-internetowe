# Start with Node.js 22 Alpine base image
FROM node:24-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Start the app
CMD ["npm", "run", "dev"]