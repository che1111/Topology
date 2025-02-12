# Use Node.js 20.17.0 as the base image
FROM node:20.17.0

# Set the working directory inside the container
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# # Install Yarn 1.22.22
# RUN npm install -g yarn@1.22.22

# Install all the dependencies using Yarn
RUN yarn install

# Set the working directory to the demo-app-ts package
WORKDIR /app/packages/demo-app-ts

# Expose the necessary port (if your app runs on a specific port, e.g., 3000)
EXPOSE 9122

# Command to run the application
CMD ["yarn", "run", "start:demo-app:hot"]