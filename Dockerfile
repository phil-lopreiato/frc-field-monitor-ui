FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('node:http');const req=http.get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));"

CMD ["npm", "start"]
