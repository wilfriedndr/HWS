FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 4200
CMD ["sh", "-c", "npx ng serve --host 0.0.0.0 --port 4200 --poll 2000"]
