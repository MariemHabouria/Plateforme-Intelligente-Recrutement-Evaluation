// src/config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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