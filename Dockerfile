FROM node:20-alpine
WORKDIR /app

# Cài deps production (dùng lock để build ổn định)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Code server + web tĩnh
COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# data.json (BXH/nến) được mount từ host qua compose, không COPY để khỏi đè
CMD ["node", "server.js"]
