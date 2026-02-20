FROM node:20-slim

# Install Chromium + its system dependencies (needed for Puppeteer headless scraping)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading its own Chromium bundle and use the system one
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Declare build args for NEXT_PUBLIC_ vars — Railway passes all service variables
# as Docker build args, but they must be declared here to be accessible at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copy source and build
COPY . .
RUN npm run build

# Bind to all interfaces so Railway can route traffic to the container
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
