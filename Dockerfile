
# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Accept the API key as a build argument
ARG VITE_API_KEY_ARG
# Expose it as an environment variable for the build process
ENV VITE_API_KEY=$VITE_API_KEY_ARG

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the static files from a lean image
FROM node:20-alpine
WORKDIR /app
# Copy only production dependencies
COPY package.json ./
RUN npm install --omit=dev
# Copy the built static assets
COPY --from=build /app/dist ./dist

# Expose the port the server will run on
EXPOSE 8080

# The command to start the production server
CMD ["npm", "start"]
