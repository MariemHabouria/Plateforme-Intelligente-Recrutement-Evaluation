// prisma.config.ts
import { defineConfig } from 'prisma/config'
import 'dotenv/config' // Important pour charger les variables d'environnement

export default defineConfig({
  // C'est ICI que l'on configure la source de données pour Prisma Migrate
  datasource: {
    url: process.env.DATABASE_URL, // L'URL est maintenant définie ici !
  },
  schema: 'prisma/schema.prisma', // Chemin vers votre schéma (optionnel car c'est la valeur par défaut)
})