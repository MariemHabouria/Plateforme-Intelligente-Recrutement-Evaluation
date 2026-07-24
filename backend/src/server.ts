import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { testConnection } from './config/database';
import { startRelanceJobs } from './jobs/relanceJob';

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

const startServer = async () => {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log('Serveur demarre sur http://localhost:' + PORT);
            console.log('Environnement: ' + process.env.NODE_ENV);
            console.log('Frontend: ' + process.env.FRONTEND_URL);
            console.log('CORS accepte: ' + allowedOrigins.join(', '));
        });
    } catch (error) {
        console.error('Erreur au demarrage:', error);
        process.exit(1);
    }
    startRelanceJobs();
};

startServer();