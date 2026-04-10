FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source
COPY public ./public
COPY src ./src

EXPOSE 3000

ENV REACT_APP_API_URL=http://localhost:8000/api

CMD ["npm", "start"]
