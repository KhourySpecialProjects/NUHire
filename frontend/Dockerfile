FROM node:22-alpine

# Install dependencies for Next.js and some common native builds
RUN apk add --no-cache \
    python3 make g++ libc-dev pkgconfig \
    pixman-dev cairo-dev pango-dev jpeg-dev \
    giflib-dev libpng-dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the Next.js app for production
RUN npm run build

# Use Render's PORT environment variable
EXPOSE $PORT

# Start Next.js production server bound to 0.0.0.0
CMD ["npm", "start"]