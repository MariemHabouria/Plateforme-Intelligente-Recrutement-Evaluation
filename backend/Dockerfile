# backend/Dockerfile
FROM node:20-slim

WORKDIR /app

# Installer les dépendances d'abord (meilleur cache Docker)
COPY package*.json ./
RUN npm ci

# Copier le reste du code
COPY . .

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "dev"]