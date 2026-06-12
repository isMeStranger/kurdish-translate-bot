FROM node:24-alpine
WORKDIR /app

# npm install first so dependency layers can be cached
COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]