import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD!,
    {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT!),
        dialect: 'postgres',
        logging: console.log // Active les logs pour voir les requêtes SQL
    }
);

export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connexion PostgreSQL réussie');
        
        // FORCER la synchronisation des modèles
        // { alter: true } va créer/modifier les tables existantes
        await sequelize.sync({ alter: true }); 
        console.log('✅ Tables synchronisées avec la base de données');
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        throw error;
    }
};

export default sequelize;