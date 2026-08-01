// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const testConnection = async () => {
    try {
        await prisma.$connect();
        console.log('Connexion PostgreSQL réussie (Prisma)');
    } catch (error) {
        console.error('Erreur de connexion:', error);
        throw error;
    }
};

export default prisma;