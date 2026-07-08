FROM node:22-alpine

WORKDIR /app

# Install dependencies first
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Disable telemetry and set network options
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Fix IP resolution for development
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]